/**
 * Clash 模板注入脚本 - 轻量稳定版
 * 特点：不触发 produceArtifact，防止内存溢出导致容器重启
 */

async function operator(content, args) {
  const { name } = args;
  if (!name) throw new Error('缺少参数 name');

  const template = content;
  
  // 1. 获取节点数据（直接从已缓存的 artifact 读取，不重新拉取生成）
  const target = $artifacts.find(a => a.name === name);
  if (!target) throw new Error(`未找到名为 ${name} 的订阅，请检查名称`);
  
  // 获取原始节点 (已经过 Sub-Store 处理后的对象数组)
  const proxies = await target.getProxies();
  if (!proxies || proxies.length === 0) throw new Error('节点列表为空');

  // 2. 定义匹配规则（包含 Hongkong, Kingdom）
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

  // 3. 将节点分类（仅保存名称）
  const categorized = {};
  for (const groupName in regionMatch) {
    categorized[groupName] = proxies
      .filter(p => {
        const lowerName = p.name.toLowerCase();
        return regionMatch[groupName].some(k => lowerName.includes(k.toLowerCase()));
      })
      .map(p => p.name);
  }

  // 4. 构建全局节点 YAML
  // 转换对象为 Clash YAML 格式（简单映射）
  const proxiesYaml = proxies.map(p => {
    const config = { ...p };
    delete config.subStoreConfig; // 移除 Sub-Store 私有属性
    return `  - ${JSON.stringify(config)}`;
  }).join('\n');

  // 5. 更新模板
  let result = template;

  // A. 全局 proxies 注入
  if (result.includes('proxies: []')) {
    result = result.replace('proxies: []', 'proxies:\n' + proxiesYaml);
  }

  // B. 地区分组注入
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

// 适配调用
if (typeof $content !== 'undefined') {
  operator($content, $arguments)
    .then(res => { $content = res; })
    .catch(err => { throw err; });
}
