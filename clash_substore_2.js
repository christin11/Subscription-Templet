/**
 * @name Clash全量分流脚本_V2
 * @description 1.移除参数依赖解决报错 2.严格 1:1 还原模板地区组 3.保留 DIRECT 兼容性
 */

async function operator(proxies) {
    if (!proxies || proxies.length === 0) return [];

    // 1. 过滤掉机场信息节点（流量、日期等）
    const validProxies = proxies.filter(p => !/流量|重置|过期|套餐/.test(p.name));
    const proxyNames = validProxies.map(p => p.name);

    // 2. 精准筛选函数：确保每个地区组只包含对应的节点
    const filter = (re) => {
        const result = proxyNames.filter(n => re.test(n));
        return result.length > 0 ? result : []; 
    };

    // 3. 定义策略组：名字必须和你模板 (.ini) 里的名字完全一致
    // 这里的数组不需要包含 DIRECT，因为 Sub-Store 会把你模板里写的 DIRECT 和这里生成的节点合并
    const groups = [
        { name: "🇭🇰 香港节点", type: "select", proxies: filter(/香港|HK|Hong/i) },
        { name: "🇹🇼 台湾节点", type: "select", proxies: filter(/台湾|TW|Taiwan/i) },
        { name: "🇯🇵 日本节点", type: "select", proxies: filter(/日本|JP|Japan/i) },
        { name: "🇰🇷 韩国节点", type: "select", proxies: filter(/韩国|KR|Korea/i) },
        { name: "🇸🇬 新加坡节点", type: "select", proxies: filter(/新加坡|SG|Singapore/i) },
        { name: "🇹🇭 泰国节点", type: "select", proxies: filter(/泰国|TH|Thailand/i) },
        { name: "🇺🇸 美国节点", type: "select", proxies: filter(/美国|US|States/i) },
        { name: "🇩🇪 德国节点", type: "select", proxies: filter(/德国|DE|Germany/i) },
        { name: "🇬🇧 英国节点", type: "select", proxies: filter(/英国|UK|Britain/i) },
        
        // 基础管理组
        { name: "🚀 手动切换", type: "select", proxies: proxyNames },
        { name: "♻️ 自动选择", type: "url-test", proxies: proxyNames, url: "http://www.gstatic.com/generate_204", interval: 300 }
    ];

    // 4. 返回数据：Sub-Store 会将 validProxies 填入 proxies: []，将 groups 合并到 proxy-groups
    return {
        proxies: validProxies,
        groups: groups
    };
}
