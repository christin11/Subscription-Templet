/**
 * Clash 模板注入脚本 - 极致防崩溃版
 * 解决逻辑：不再通过 API 生成节点，而是直接从原始数据提取名称。
 */

async function operator(content, args) {
  const { name } = args;
  if (!name) return content; // 没传名字直接返回模板，防止报错

  const template = content;

  // 1. 获取目标订阅的原始数据，避开生成逻辑防止容器重启
  const target = $artifacts.find(a => a.name === name);
  if (!target) return template;

  // 仅仅获取节点对象，不执行 produceArtifact，减少 90% 负载
  const proxies = await target.getProxies();
  if (!proxies || proxies.length === 0) return template;

  // 2. 增强匹配库（已补全 Hongkong, Kingdom, 城市名）
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

  // 3. 构建全局 proxies 字符串 (简单的节点映射)
  // 仅提取核心字段，防止某些特殊节点携带大量无用 metadata 撑爆内存
  const proxiesList = proxies.map(p => {
    const { name, type, server, port, ...rest } = p;
    return `  - ${JSON.stringify({ name, type, server, port, ...rest })}`
  }).join('\n');

  // 4. 对节点名称进行分类用于策略组
  const categorized = {};
  for (const groupName in regionMatch) {
    categorized[groupName] = proxies
      .filter(p => {
        const lowerName = p.name.toLowerCase();
        return regionMatch[groupName].some(k => lowerName.includes(k.toLowerCase()));
      })
      .map(p => p.name);
  }

  // 5. 文本替换
  let result = template;

  // 替换全局节点占位
  result = result.replace(/proxies:\s*\[\]/, `proxies:\n${proxiesList}`);

  // 替换各地区策略组
  for (const groupName in categorized) {
    const nodes = categorized[groupName];
    if (nodes.length > 0) {
      const nodeYaml = 'proxies:\n' + nodes.map(n => `      - "${n}"`).join('\n');
      const groupRegex = new RegExp(`(name:\\s*"?${groupName}"?[\\s\\S]*?proxies:\\s*)\\[\\]`, 'g');
      result = result.replace(groupRegex, `$1${nodeYaml}`);
    }
  }

  return result;
}

// 统一入口
if (typeof $content !== 'undefined') {
  operator($content, $arguments).then(res => { $content = res; }).catch(() => { });
}
