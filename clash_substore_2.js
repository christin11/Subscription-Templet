// === 修复版：自动过滤空分组 + 使用 YAML 模板 ===

async function operator({ request, response }) {
    const url = request.query.url;
    const name = request.query.name || "default";

    if (!url) {
        return response.error("缺少参数：url");
    }

    let artifact = "";
    try {
        artifact = await $http.get(url);
    } catch (e) {
        return response.error("无法下载 Sub-Store 内容：" + e);
    }

    if (!artifact || typeof artifact !== "string") {
        artifact = "";
    }

    let proxiesText = "";
    const match = artifact.match(/proxies:\s*([\s\S]*)/m);
    if (match) {
        proxiesText = match[0].trim();
    } else {
        proxiesText = "proxies: []";
    }

    let proxiesList = [];
    try {
        const yamlObj = YAML.parse(artifact);
        proxiesList = yamlObj.proxies || [];
    } catch (e) {
        proxiesList = [];
    }

    function detectRegion(proxy) {
        const s = proxy.server.toLowerCase();
        const n = proxy.name.toLowerCase();

        if (s.includes("hk") || n.includes("hongkong") || n.includes("香港")) return "🇭🇰 香港节点";
        if (s.includes("jp") || n.includes("japan") || n.includes("日本")) return "🇯🇵 日本节点";
        if (s.includes("sg") || n.includes("singapore") || n.includes("新加坡")) return "🇸🇬 新加坡节点";
        if (s.includes("us") || n.includes("usa") || n.includes("美国")) return "🇺🇸 美国节点";
        if (s.includes("uk") || n.includes("united kingdom") || n.includes("英国")) return "🇬🇧 英国节点";

        return "🌐 未分类节点";
    }

    const regionGroups = {
        "🇭🇰 香港节点": [],
        "🇯🇵 日本节点": [],
        "🇸🇬 新加坡节点": [],
        "🇺🇸 美国节点": [],
        "🇬🇧 英国节点": [],
        "🌐 未分类节点": []
    };

    for (const p of proxiesList) {
        const region = detectRegion(p);
        regionGroups[region].push(p.name);
    }

    let template = "";
    try {
        template = await $http.get(
            "https://ghproxy.com/https://raw.githubusercontent.com/christin11/Subscription-Templet/refs/heads/main/Clash_Templet.yaml"
        );
    } catch (e) {
        return response.error("无法下载模板：" + e);
    }

    if (!template) {
        return response.error("模板内容为空");
    }

    let output = template.replace(
        "#__PROXIES__",
        proxiesText.trim() + "\n\n"
    );

    // ⭐ 核心修复：空分组直接删除
    for (const region in regionGroups) {
        const list = regionGroups[region];
        const placeholder = `#REGION_${region}`;

        if (!output.includes(placeholder)) continue;

        if (list.length === 0) {
            const regex = new RegExp(`.*${placeholder}.*\\n?`, "g");
            output = output.replace(regex, "");
        } else {
            output = output.replace(
                placeholder,
                list.map(p => `- ${p}`).join("\n      ")
            );
        }
    }

    return response.success({
        name: `${name}.yaml`,
        content: output
    });
}
