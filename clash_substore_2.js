/**
 * @name Clash全量保留与精准分流脚本
 * @description 不修改模板结构，仅负责将节点分类投喂给对应的地区组
 */

async function operator(proxies) {
    if (!proxies || proxies.length === 0) return [];

    // 1. 过滤掉机场信息节点
    const validProxies = proxies.filter(p => !/流量|重置|过期|套餐/.test(p.name));

    // 2. 这里的逻辑是关键：我们返回一个包含分组信息的对象
    // Sub-Store 会把这些节点合并到你模板中同名的 proxy-groups 里
    const groups = [
        {
            name: "🇭🇰 香港节点",
            type: "select",
            proxies: validProxies.filter(p => /香港|HK|Hong/i.test(p.name)).map(p => p.name)
        },
        {
            name: "🇹🇼 台湾节点",
            type: "select",
            proxies: validProxies.filter(p => /台湾|TW|Taiwan/i.test(p.name)).map(p => p.name)
        },
        {
            name: "🇯🇵 日本节点",
            type: "select",
            proxies: validProxies.filter(p => /日本|JP|Japan/i.test(p.name)).map(p => p.name)
        },
        {
            name: "🇰🇷 韩国节点",
            type: "select",
            proxies: validProxies.filter(p => /韩国|KR|Korea/i.test(p.name)).map(p => p.name)
        },
        {
            name: "🇸🇬 新加坡节点",
            type: "select",
            proxies: validProxies.filter(p => /新加坡|SG|Singapore/i.test(p.name)).map(p => p.name)
        },
        {
            name: "🇺🇸 美国节点",
            type: "select",
            proxies: validProxies.filter(p => /美国|US|States/i.test(p.name)).map(p => p.name)
        },
        {
            name: "🇹🇭 泰国节点",
            type: "select",
            proxies: validProxies.filter(p => /泰国|TH|Thailand/i.test(p.name)).map(p => p.name)
        },
        {
            name: "🇩🇪 德国节点",
            type: "select",
            proxies: validProxies.filter(p => /德国|DE|Germany/i.test(p.name)).map(p => p.name)
        },
        {
            name: "🇬🇧 英国节点",
            type: "select",
            proxies: validProxies.filter(p => /英国|UK|Britain/i.test(p.name)).map(p => p.name)
        },
        {
            name: "🚀 手动切换",
            type: "select",
            proxies: validProxies.map(p => p.name)
        },
        {
            name: "♻️ 自动选择",
            type: "url-test",
            proxies: validProxies.map(p => p.name),
            url: "http://www.gstatic.com/generate_204",
            interval: 300
        }
    ];

    return {
        proxies: validProxies,
        groups: groups
    };
}
