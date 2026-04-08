/**
 * Clash 模板节点注入脚本 - 最终兼容修复版
 */

async function operator(content, args) {
  const { type, name } = args;
  if (!name) throw new Error('缺少参数 name，请在链接后加 #name=订阅名');

  const artifactType = /^1$|col|组合/i.test(type) ? 'collection' : 'subscription';
  const template = content;

  // 1. 定义匹配逻辑（补全 Hongkong, Kingdom 及主流城市名）
  const regionMatch = {
    '🇭🇰 香港节点': ['香港', 'HK', 'Hong Kong', 'Hongkong', '🇭🇰'],
    '🇹🇼 台湾节点': ['台湾', '臺灣', 'TW', 'Taiwan', '新北', '彰化', '高雄', '🇹🇼'],
    '🇯🇵 日本节点': ['日本', 'JP', 'Japan', '东京', '大阪', '名古屋', '埼玉', '福冈', '🇯🇵'],
    '🇰🇷 韩国节点': ['韩国', '韓國', 'KR', 'Korea', '首尔', '春川', '🇰🇷'],
    '🇸🇬 新加坡节点': ['新加坡', 'SG', 'Singapore', '狮城', '🇸🇬'],
    '🇹🇭 泰国节点': ['泰国', '泰國', 'TH', 'Thailand', '曼谷', '🇹🇭'],
    '🇺🇸 美国节点': ['美国', '美國', 'US', 'United States', 'America', '圣何塞', '洛杉矶', '西雅图', '芝加哥', '纽约', '🇺🇸'],
    '🇩🇪 德国节点': ['德国', '德國', 'DE', 'Germany', '法兰克福', '柏林', '杜塞尔多夫', '🇩🇪'],
    '🇬🇧 英国节点': ['英国', '英國', 'UK', 'United Kingdom', 'Kingdom', 'Britain', 'GB', '伦敦', '🇬🇧']
  };

  // 2. 拉取订阅节点
  const proxiesYaml = await produceArtifact({
    name,
    type: artifactType,
    platform: 'Clash',
  });
  if (!proxiesYaml) throw new Error('节点拉取失败，请检查订阅名');

  // 3. 解析节点名称用于分组
  const allProxyNames = [];
  const lines = proxiesYaml.split('\n');
  for (const line of lines) {
    if (line.includes('name:')) {
      const m = line.match(/name:\s*["']?([^"'\n]+)["']?/);
      if (m) allProxyNames.push(m[1].trim());
    }
  }

  // 4. 开始更新模板
  let result = template;

  // A. 替换全局 proxies: []
  if (result.includes('proxies: []')) {
    result = result.replace('proxies: []', 'proxies:\n' + proxiesYaml);
  }

  // B. 遍历地区并注入
  for (const groupName in regionMatch) {
    const matchedNodes = allProxyNames.filter(proxyName => {
      const lowerProxy = proxyName.toLowerCase();
      return regionMatch[groupName].some(k => lowerProxy.includes(k.toLowerCase()));
    });

    if (matchedNodes.length > 0) {
      // 构建 YAML 节点列表字符串
      const nodeYaml = 'proxies:\n' + matchedNodes.map(n => `      - "${n}"`).join('\n');
      
      // 精准定位到分组下的 proxies: [] 并替换
      const groupRegex = new RegExp(`(name:\\s*"?${groupName}"?[\\s\\S]*?proxies:\\s*)\\[\\]`, 'g');
      result = result.replace(groupRegex, `$1${nodeYaml}`);
    }
  }

  return result;
}

// 脚本执行入口，确保兼容 Sub-Store 不同位置的调用
if (typeof $content !== 'undefined') {
  operator($content, $arguments)
    .then(res => { $content = res; })
    .catch(err => { throw err; });
}
