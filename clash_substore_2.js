/**
 * @name Clash增强型模板注入脚本
 * @description 1.解决 proxies: 段缺失报错 2.强力清洗控制字符 3.保留所有地区分流
 */

async function operator(proxies) {
  // 1. 自动识别订阅名，解决参数报错
  let name = $arguments.name || ($artifact && $artifact.name) || 'Flyint';
  let type = $arguments.type === 'collection' ? 'collection' : 'subscription';
  log(`🚀 开始处理订阅: ${name} (${type})`);

  // 2. 拉取订阅节点
  const artifact = await produceArtifact({
    name,
    type,
    platform: 'Clash',
  });

  if (!artifact) throw new Error('订阅内容为空，请检查 Sub-Store 节点来源');

  // 3. 核心修复：智能提取节点行
  // 不再寻找 "proxies:" 字符串，而是提取所有以 "- " 开头的行
  let nodeLines = [];
  const rawLines = artifact.split('\n');
  
  for (let line of rawLines) {
    let trimmed = line.trim();
    // 只要是节点行（- 开头）或者是在 proxies: 标签之后的行都保留
    if (trimmed.startsWith('- ') || trimmed.startsWith('name:')) {
      // 强制清洗非法控制字符，防止 "control character not allowed"
      const cleanLine = line.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
      if (cleanLine.trim().length > 0) {
        nodeLines.push('      ' + cleanLine.trim());
      }
    }
  }

  if (nodeLines.length === 0) {
    throw new Error('在订阅中未提取到任何有效节点，请确认节点格式是否正确');
  }

  // 4. 构建标准 proxy-providers 块
  const providerBlock = `proxy-providers:\n  ${name}:\n    type: inline\n    proxies:\n${nodeLines.join('\n')}`;

  // 5. 注入模板 (不简化，保留 .ini 里的所有组)
  let result = $content;
  if (result.includes('proxy-providers:')) {
    // 定位并替换现有的 proxy-providers 块
    result = result.replace(/proxy-providers:[\s\S]*?(?=\n\n|\nproxy-groups:|$)/, providerBlock);
  } else {
    // 模板没写占位符则插在最前面
    result = providerBlock + '\n\n' + result;
  }

  log('✅ 注入成功，节点已清洗');
  return result;
}
