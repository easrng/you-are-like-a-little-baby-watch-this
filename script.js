import htm from "https://unpkg.com/htm@3.1.1/dist/htm.module.js";
import { render, h, setDocument, options } from "./preact-patched.js";
import { useEffect, useState } from "./preact-hooks-patched.js";
const oldHook = options.vnode;
options.vnode = (vnode) => {
  vnode.props = Object.fromEntries(
    Object.entries(vnode.props).map(([k, v]) => [
      k === "children" ? "children" : "* * " + k.replace(/^\* \* /, ""),
      k === "children"
        ? v
        : typeof v === "object" || typeof v === "function"
        ? [v]
        : v,
    ])
  );
  if (oldHook) {
    oldHook(vnode);
  }
};
import satori_ from "https://esm.sh/satori@0.10.1";
import { createIntlSegmenterPolyfill } from "https://esm.sh/intl-segmenter-polyfill@0.4.4";
const segmenterPolyfilled = (async () => {
  if (!Intl.Segmenter) {
    Intl.Segmenter = await createIntlSegmenterPolyfill(
      fetch(
        "https://unpkg.com/intl-segmenter-polyfill@0.4.4/dist/break_iterator.wasm"
      )
    );
  }
})();
const satori = (...a) => segmenterPolyfilled.then(() => satori_(...a));
import undom from "./undom.js";
const html = htm.bind(h);
const vdoc = undom();
setDocument(vdoc);
function serialize(el) {
  if (el.nodeType === 3) {
    return el.nodeValue;
  }
  return {
    type: el.nodeName.toLowerCase(),
    props: {
      ...Object.fromEntries(
        el.attributes.map((e) => [
          e.name.replace(/^\* \* /, ""),
          Array.isArray(e.value) ? e.value[0] : e.value,
        ])
      ),
      children: el.childNodes.map(serialize),
    },
  };
}
let updatePending = false;
let notoSans = (async () =>
  await (
    await fetch(
      "https://fonts.gstatic.com/s/notosans/v28/o-0IIpQlx3QUlC5A4PNb4g.ttf"
    )
  ).arrayBuffer())();
vdoc.addEventListener("mutation", async () => {
  if (!updatePending) {
    updatePending = true;
    setTimeout(async () => {
      updatePending = false;
      document.body.innerHTML = await satori(
        serialize(vdoc.body.childNodes[0]),
        {
          width: 600,
          height: 400,
          fonts: [
            {
              name: "Noto Sans",
              data: await notoSans,
              weight: 400,
              style: "normal",
            },
          ],
        }
      );
    }, 0);
  }
});
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setTimeout(() => {
      setCount(count+1);
    }, 1000);
  }, [count]);
  return html`<div
    style=${{
      display: "flex",
      flexDirection: "column",
      background: "#111",
      color: "#eee",
      padding: 10,
      height: "100%"
    }}
  >
    <h1>this demo has been running for ${count} seconds</h1>
    <p>
      this is a preact app rendered headlessly to svg with satori and a custom
      hacked-up copy of undom
    </p>
  </div>`;
}
render(html`<${Counter} />`, vdoc.body);
window.vdoc = vdoc;
