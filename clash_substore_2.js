/**
 * @name Clash增强型模板注入脚本_终极版
 * @description 1. 兼容所有 artifact 格式（解决找不到 proxies: 段问题）
 * 2. 强力清洗 YAML 控制字符（解决导入报错）
 * 3. 保留模板原有结构，不进行任何功能简化
 */

async function operator(proxies) {
  // 1. 自动获取订阅名，解决参数 Missing Name 报错
  let name = $arguments.name || ($artifact && $artifact.name) || 'Flyint';
  let type = $arguments.type === 'collection' ? 'collection' : 'subscription';
  log(`🚀 正在处理订阅: ${name}`);

  // 2. 获取原始节点数据
  const rawArtifact = await produceArtifact({
    name,
    type,
    platform: 'Clash',
  });

  if (!rawArtifact) throw new Error('Sub-Store 返回的节点数据为空');

  // 3. 核心清洗：去除 UTF-8 BOM 和所有 ASCII 控制字符 (\x00-\x1F, \x7F)
  // 这是解决 "control character not allowed" 的终极方案，保留 Emoji 但删除乱码
  const cleanArtifact = rawArtifact
    .replace(/^\uFEFF/, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 4. 提取节点行（解决“找不到 proxies: 段”的问题）
  // 采用行扫描：只要是以 "- " 开头的行，全部视为有效节点
  const lines = cleanArtifact.split('\n');
  const nodeLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    // 识别节点行的特征：以 "- " 开头且包含 "name:" 或配置项
    if (trimmed.startsWith('- ') && (trimmed.includes('name:') || trimmed.includes('server:'))) {
      nodeLines.push('      ' + trimmed);
    } else if (trimmed.startsWith('name:') || trimmed.startsWith('type:') || trimmed.startsWith('server:')) {
      // 兼容某些不带横杠的缩进行
      nodeLines.push('      ' + line.replace(/^\s+/, '  ')); 
    }
  }

  // 保底逻辑：如果上面的精细识别失败，抓取所有 "- " 开头的行
  if (nodeLines.length === 0) {
    lines.forEach(l => {
      if (l.trim().startsWith('- ')) {
        nodeLines.push('      ' + l.trim());
      }
    });
  }

  if (nodeLines.length === 0) throw new Error('解析失败：未能在订阅中找到有效的 Clash 节点行');

  // 5. 构建标准的 proxy-providers 块（严格遵循你的模板缩进）
  const providerBlock = `proxy-providers:\n  ${name}:\n    type: inline\n    proxies:\n${nodeLines.join('\n')}`;

  // 6. 注入模板，替换 proxy-providers 占位符
  let result = $content;
  if (result.includes('proxy-providers:')) {
    // 使用非贪婪匹配，定位并替换 proxy-providers 块
    // 匹配到下一个空行、或下一个大项（proxy-groups/rules）为止
    result = result.replace(/proxy-providers:[\s\S]*?(?=\n\n|\nproxy-groups:|\nrules:|$)/, providerBlock);
  } else {
    // 如果模板没写占位符，直接插在最前面
    result = providerBlock + '\n\n' + result;
  }

  log('✅ 脚本执行成功：节点已清洗并注入模板');
  $content = result;
}
