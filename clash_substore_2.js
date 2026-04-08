// === 核心修复：删除整个空 group ===
for (const region in regionGroups) {
    const list = regionGroups[region];

    // 匹配整个 proxy-group 块（非常关键）
    const groupRegex = new RegExp(
        `- name: ${region}[\\s\\S]*?(?=- name:|$)`,
        "g"
    );

    if (list.length === 0) {
        // ❌ 没节点 → 删除整个 group
        output = output.replace(groupRegex, "");
    } else {
        // ✅ 有节点 → 填充 proxies
        output = output.replace(
            new RegExp(`#REGION_${region}`, "g"),
            list.map(p => `- ${p}`).join("\n      ")
        );
    }
}
