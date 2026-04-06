/**
 * @name Clash转换脚本
 * @description 适配Sub-Store, 引用订阅并注入模板
 */

async function operator(proxies) {
    // 即使参数编辑打不开，Sub-Store 也会将当前文件的“订阅源”节点传给 proxies
    if (!proxies || proxies.length === 0) {
        console.log("提示：未获取到节点，请检查文件编辑页面的【订阅源】是否已勾选");
        return [];
    }

    console.log(`成功处理节点数量: ${proxies.length}`);
    return proxies;
}
