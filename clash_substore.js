/**
 * Sub Store 文件脚本 - Clash 模板注入
 * ─────────────────────────────────────
 * 参数编辑中添加：
 *   key:   providers
 *   value: name1|url1,name2|url2,name3|url3
 *
 * 其中 url 填你 Sub Store 生成的下载链接，例如：
 *   SaySS|http://127.0.0.1:2999/download/SaySS?target=clash
 *
 * 多个机场用英文逗号分隔。
 */

function main() {
  // ── 1. 解析参数 ─────────────────────────────────────────────────────────
  const args = parseArgument($argument);
  const raw = args["providers"];
  if (!raw) {
    throw new Error("缺少参数 providers");
  }

  // 格式：name1|url1,name2|url2
  const providers = raw.split(",").map(item => {
    const idx = item.indexOf("|");
    if (idx === -1) throw new Error(`格式错误，缺少 | 分隔符：${item}`);
    return {
      name: item.slice(0, idx).trim(),
      url:  item.slice(idx + 1).trim(),
    };
  }).filter(p => p.name && p.url);

  if (!providers.length) {
    throw new Error("providers 解析结果为空，请检查参数格式");
  }

  // ── 2. 构建 proxy-providers YAML 块 ─────────────────────────────────────
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

  // ── 3. 注入到模板 ────────────────────────────────────────────────────────
  let template = $content;
  const pattern = /^proxy-providers:[\s\S]*?(?=^\w)/m;

  if (pattern.test(template)) {
    template = template.replace(pattern, providerBlock + "\n");
  } else {
    template = template.replace("proxy-groups:", providerBlock + "\nproxy-groups:");
  }

  return template;
}

// ── 工具函数 ──────────────────────────────────────────────────────────────
function parseArgument(argument) {
  const result = {};
  if (!argument) return result;
  argument.split("&").forEach(pair => {
    const [key, ...rest] = pair.split("=");
    if (key) result[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
  });
  return result;
}

// ── 执行（同步，不用 async/await，避免环境兼容问题） ─────────────────────
try {
  $done(main());
} catch (err) {
  console.error("[clash_substore] " + err.message);
  $done("");
}
