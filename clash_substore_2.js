/**
 * Clash 模板节点注入脚本 - 修复版
 * 适用场景：Sub-Store 快捷脚本 / 文件脚本
 */

async function execute() {
  let { type, name } = $arguments;
  if (!name) throw new Error('缺少参数 name，请在链接后加 #name=订阅名');

  type = /^1$|col|组合/i.test(type) ? 'collection' : 'subscription';
  const template = $content;
  if (!template) throw new Error('模板内容为空');

  // 1. 定义匹配规则 (内置正则，覆盖 Hongkong, Kingdom, 城市名等)
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
    type,
    platform: 'Clash',
  });
  if (!proxiesYaml) throw new Error('节点拉取失败');

  // 3. 解析所有节点名称
  const allProxyNames = [];
  proxiesYaml.split('\n').forEach(line => {
    if (line.includes('name:')) {
      const match = line.match(/name:\s*["']?([^"'\n]+)["']?/);
      if (match) allProxyNames.push(match[1].trim());
    }
  });

  // 4. 按地区对节点进行分类
  const categorized = {};
  for (const groupName in regionMatch) {
    categorized[groupName] = allProxyNames.filter(proxyName => {
      const lowerName = proxyName.toLowerCase();
      return regionMatch[groupName].some(keyword => 
        lowerName.includes(keyword.toLowerCase())
      );
    });
  }

  // 5. 注入模板
  let result = template;

  // A. 注入全局节点列表 (寻找 proxies: [] 并替换)
  result = result.replace(/proxies:\s*\[\]/, `proxies:\n${proxiesYaml}`);

  // B. 注入各个地区策略组
  for (const groupName in categorized) {
    const nodes = categorized[groupName];
    if (nodes.length > 0) {
      // 构建 YAML 格式列表
      const nodeYaml = 'proxies:\n' + nodes.map(n => `      - "${n}"`).join('\n');
      
      // 使用正则匹配对应的策略组名，并替换其下的空 proxies: []
      const groupRegex = new RegExp(`(name:\\s*"?${groupName}"?[\\s\\S]*?proxies:\\s*)\\[\\]`, 'g');
      result = result.replace(groupRegex, `$1${nodeYaml}`);
    }
  }

  $content = result;
}

// 执行脚本
execute().catch(err => {
  // 备用错误显示，如果环境支持 console
  if (typeof console !== 'undefined') console.log(err);
  throw err;
});
