/**
 * Sub Store 文件脚本 - Clash 模板注入
 * ─────────────────────────────────────
 * 原理：
 *   通过 Sub Store 内部 API 读取指定订阅或组合订阅的信息，
 *   动态生成 proxy-providers 块，注入到 GitHub 托管的 Clash 模板中。
 *
 * 使用步骤：
 *   1. Sub Store → 文件管理 → 新建文件
 *        类型：文件
 *        来源：远程
 *        链接：Clash_Templet.ini 的 GitHub raw URL
 *   2. 脚本操作 → 类型选「链接」→ 填入此脚本的 GitHub raw URL
 *   3. 参数编辑中添加：
 *        key:   name
 *        value: 订阅或组合订阅的名称
 *        key:   type
 *        value: subscription（单条）或 collection（组合），默认 collection
 *
 * $argument 格式：name=你的订阅名&type=collection
 */

async function main() {
  // ── 1. 解析参数 ─────────────────────────────────────────────────────────
  const args = parseArgument($argument);
  const subName = args["name"];
  const subType = args["type"] || "collection"; // 默认组合订阅

  if (!subName) {
    throw new Error("缺少参数 name，请在参数编辑中填写订阅名称");
  }

  const baseUrl = ($substore.env && $substore.env.base_url) || "http://127.0.0.1:2999";

  // ── 2. 根据类型获取 providers 列表 ─────────────────────────────────────
  let providers = [];

  if (subType === "collection") {
    // 组合订阅：找到成员列表，每个成员单独作为一个 provider
    const collections = await $substore.storage.getItem("collections") || [];
    const collection = collections.find(c => c.name === subName);
    if (!collection) {
      throw new Error(`找不到组合订阅「${subName}」`);
    }
    const memberNames = collection.subscriptions || [];
    if (!memberNames.length) {
      throw new Error(`组合订阅「${subName}」里没有任何订阅`);
    }
    providers = memberNames.map(name => ({
      name,
      url: `${baseUrl}/download/${encodeURIComponent(name)}?target=clash`,
    }));

  } else if (subType === "subscription") {
    // 单条订阅：直接作为一个 provider
    const subscriptions = await $substore.storage.getItem("subscriptions") || [];
    const sub = subscriptions.find(s => s.name === subName);
    if (!sub) {
      throw new Error(`找不到订阅「${subName}」`);
    }
    providers = [{
      name: subName,
      url: `${baseUrl}/download/${encodeURIComponent(subName)}?target=clash`,
    }];

  } else {
    throw new Error(`未知的 type 参数「${subType}」，请填 collection 或 subscription`);
  }

  // ── 3. 构建 proxy-providers YAML 块 ─────────────────────────────────────
  const providerYaml = providers.map(({ name, url }) => [
    `  ${name}:`,
    `    type: http`,
    `    url: "${url}"`,
    `    interval: 86400`,
    `    path: ./providers/${name}.yaml`,
    `    health-check:`,
    `      enable: true`,
    `      interval: 600`,
    `      url: "https://www.gstatic.com/generate_204"`,
  ].join("\n")).join("\n");

  const providerBlock = "proxy-providers:\n" + providerYaml;

  // ── 4. 注入到模板 ────────────────────────────────────────────────────────
  let template = $content;
  const pattern = /^proxy-providers:[\s\S]*?(?=^\w)/m;

  if (pattern.test(template)) {
    template = template.replace(pattern, providerBlock + "\n");
  } else {
    template = template.replace("proxy-groups:", providerBlock + "\nproxy-groups:");
  }

  return template;
}

// ── 工具函数：解析 key=value&key2=value2 格式的参数 ──────────────────────
function parseArgument(argument) {
  const result = {};
  if (!argument) return result;
  argument.split("&").forEach(pair => {
    const [key, ...rest] = pair.split("=");
    if (key) result[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
  });
  return result;
}

// ── 执行 ──────────────────────────────────────────────────────────────────
main().then(result => {
  $done(result);
}).catch(err => {
  console.error("[clash_substore] 脚本执行失败：" + err.message);
  $done("");
});
