/**
 * Sub Store 文件脚本
 * 用途：从多个 Sub Store 订阅 URL 拉取节点，
 *       动态注入到 Clash Meta 模板的 proxy-providers 中
 *
 * 使用方式：
 *   Sub Store → 文件管理 → 新建文件
 *     类型：文件
 *     来源：远程
 *     链接：你的 Clash_Templet.ini 的 raw URL
 *   → 脚本操作 → 粘贴此脚本
 *   → 参数编辑中填入 providers（见下方说明）
 *
 * 参数（在 Sub Store 参数编辑中设置）：
 *   key: providers
 *   value: JSON 数组，格式如下（每项是一个 Sub Store 订阅的 raw URL）：
 *   [
 *     {"name":"SaySS",  "url":"https://你的substore地址/download/SaySS?target=clash"},
 *     {"name":"BitzNet","url":"https://你的substore地址/download/BitzNet?target=clash"}
 *   ]
 */

// ── 入口：Sub Store 会把参数注入到 $argument，文件内容注入到 $content ──
async function main() {
  // 1. 解析参数中的 providers 列表
  const providers = parseProviders($argument);
  if (!providers.length) {
    throw new Error("[clash_substore] 参数 providers 为空，请在参数编辑中填写机场列表");
  }

  // 2. 拉取模板（$content 已是模板文件内容）
  let template = $content;
  if (!template || !template.includes("proxy-providers")) {
    throw new Error("[clash_substore] 模板内容异常，请检查文件链接是否正确");
  }

  // 3. 为每个机场构建 proxy-provider 块并组装
  const providerBlock = buildProviderBlock(providers);

  // 4. 替换模板中的 proxy-providers 区块
  template = injectProviders(template, providerBlock);

  // 5. 返回最终配置
  return template;
}

// ── 解析参数 ──────────────────────────────────────────────────────────────
function parseProviders(argument) {
  // argument 是 Sub Store 传入的参数字符串，格式为 key=value 或 JSON
  // 我们约定 providers 参数直接是 JSON 字符串
  try {
    // 尝试从 key=value 格式里取 providers
    const match = argument.match(/providers=(.+)/s);
    const raw = match ? match[1] : argument;
    return JSON.parse(decodeURIComponent(raw));
  } catch (e) {
    throw new Error("[clash_substore] providers 参数解析失败，请确认是合法的 JSON 数组：" + e.message);
  }
}

// ── 构建 proxy-providers YAML 块 ──────────────────────────────────────────
function buildProviderBlock(providers) {
  const blocks = providers.map(({ name, url }) => {
    // Sub Store 的 Clash 订阅 URL 直接作为 proxy-provider 的 url
    return [
      `  ${name}:`,
      `    type: http`,
      `    url: "${url}"`,
      `    interval: 86400`,
      `    path: ./providers/${name}.yaml`,
      `    health-check:`,
      `      enable: true`,
      `      interval: 600`,
      `      url: "https://www.gstatic.com/generate_204"`,
    ].join("\n");
  });

  return "proxy-providers:\n" + blocks.join("\n");
}

// ── 将 provider 块注入模板 ────────────────────────────────────────────────
function injectProviders(template, providerBlock) {
  // 匹配 proxy-providers: 到下一个顶级 key 之间的内容（包含空值情况）
  const pattern = /^proxy-providers:[\s\S]*?(?=^\w|\Z)/m;

  if (pattern.test(template)) {
    return template.replace(pattern, providerBlock + "\n");
  } else {
    // 找不到则插入到 proxy-groups 之前
    return template.replace("proxy-groups:", providerBlock + "\nproxy-groups:");
  }
}

// ── 执行 ──────────────────────────────────────────────────────────────────
main().then(result => {
  $done(result);
}).catch(err => {
  console.error(err.message);
  $done($content); // 出错时原样返回模板，避免客户端拿到空配置
});
