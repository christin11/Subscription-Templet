// === 全自动稳定版 Sub-Store → Clash_Templet.ini 生成脚本 ===
// 100% 不会因 proxies 缺失、YAML 格式变化、空订阅而报错

async function operator({ request, response }) {
    const url = request.query.url;
    const name = request.query.name || "default";

    if (!url) {
        return response.error("缺少参数：url");
    }

    // 下载 Sub-Store 转换后的 Clash YAML
    let artifact = "";
    try {
        artifact = await $http.get(url);
    } catch (e) {
        return response.error("无法下载 Sub-Store 内容：" + e);
    }

    if (!artifact || typeof artifact !== "string") {
        artifact = "";
    }

    // 尝试提取 proxies（不报错）
    let proxies = "";
    const match = artifact.match(/proxies:\s*([\s\S]*)/m);
    if (match) {
        proxies = match[0].trim();
    } else {
        proxies = "proxies: []   # Sub-Store 未返回节点，已自动填空";
    }

    // 下载模板
    let template = "";
    try {
        template = await $http.get(
            "https://raw.githubusercontent.com/christin11/Subscription-Templet/refs/heads/main/Clash_Templet.ini"
        );
    } catch (e) {
        return response.error("无法下载模板：" + e);
    }

    if (!template) {
        return response.error("模板内容为空");
    }

    // 将 proxies 插入到模板中的标记位置
    const output = template.replace(
        "#__PROXIES__",
        proxies
    );

    return response.success({
        name: `${name}.yaml`,
        content: output
    });
}
