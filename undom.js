function assign(obj, props) {
  for (let i in props) obj[i] = props[i];
}

function toLower(str) {
  return String(str).toLowerCase();
}

function splice(arr, item, add, byValueOnly) {
  let i = arr ? findWhere(arr, item, true, byValueOnly) : -1;
  if (~i) add ? arr.splice(i, 0, add) : arr.splice(i, 1);
  return i;
}

function findWhere(arr, fn, returnIndex, byValueOnly) {
  let i = arr.length;
  while (i--)
    if (typeof fn === "function" && !byValueOnly ? fn(arr[i]) : arr[i] === fn)
      break;
  return returnIndex ? i : arr[i];
}

function createAttributeFilter(ns, name) {
  return (o) => o.ns === ns && toLower(o.name) === toLower(name);
}

/** Create a minimally viable DOM Document
 *	@returns {Document} document
 */
export default function undom() {
  function isElement(node) {
    return node.nodeType === 1;
  }

  class Event {
    constructor(type, opts) {
      this.type = type;
      this.bubbles = !!(opts && opts.bubbles);
      this.cancelable = !!(opts && opts.cancelable);
    }
    stopPropagation() {
      this._stop = true;
    }
    stopImmediatePropagation() {
      this._end = this._stop = true;
    }
    preventDefault() {
      this.defaultPrevented = true;
    }
  }

  class Node {
    constructor(nodeType, nodeName) {
      this.nodeType = nodeType;
      this.nodeName = nodeName;
      this.childNodes = [];
      this.__handlers = {};
    }
    _mutation() {
      this.dispatchEvent(new Event("mutation", { bubbles: true }));
    }
    get nextSibling() {
      let p = this.parentNode;
      if (p) return p.childNodes[findWhere(p.childNodes, this, true) + 1];
    }
    get previousSibling() {
      let p = this.parentNode;
      if (p) return p.childNodes[findWhere(p.childNodes, this, true) - 1];
    }
    get firstChild() {
      return this.childNodes[0];
    }
    get lastChild() {
      return this.childNodes[this.childNodes.length - 1];
    }
    appendChild(child) {
      this.insertBefore(child);
      return child;
    }
    insertBefore(child, ref) {
      child.remove();
      child.parentNode = this;
      !ref ? this.childNodes.push(child) : splice(this.childNodes, ref, child);
      this._mutation();
      return child;
    }
    replaceChild(child, ref) {
      if (ref.parentNode === this) {
        this.insertBefore(child, ref);
        ref.remove();
        return ref;
      }
    }
    removeChild(child) {
      splice(this.childNodes, child);
      this._mutation();
      return child;
    }
    remove() {
      if (this.parentNode) this.parentNode.removeChild(this);
    }

    addEventListener(type, handler) {
      (
        this.__handlers[toLower(type)] || (this.__handlers[toLower(type)] = [])
      ).push(handler);
    }
    removeEventListener(type, handler) {
      splice(this.__handlers[toLower(type)], handler, 0, true);
    }
    dispatchEvent(event) {
      let t = (event.target = this),
        c = event.cancelable,
        l,
        i;
      do {
        event.currentTarget = t;
        l = t.__handlers && t.__handlers[toLower(event.type)];
        if (l)
          for (i = l.length; i--; ) {
            if ((l[i].call(t, event) === false || event._end) && c) {
              event.defaultPrevented = true;
            }
          }
      } while (event.bubbles && !(c && event._stop) && (t = t.parentNode));
      return l != null;
    }
  }

  class Text extends Node {
    constructor(text) {
      super(3, "#text"); // TEXT_NODE
      this.nodeValue = text;
    }
    set data(text) {
      this.nodeValue = text;
      this._mutation();
    }
    get data() {
      return this.nodeValue;
    }
  }

  class Element extends Node {
    constructor(nodeType, nodeName) {
      super(nodeType || 1, nodeName); // ELEMENT_NODE
      this.attributes = [];
    }
    get children() {
      return this.childNodes.filter(isElement);
    }
    setAttribute(key, value) {
      this.setAttributeNS(null, key, value);
    }
    getAttribute(key) {
      return this.getAttributeNS(null, key);
    }
    removeAttribute(key) {
      this.removeAttributeNS(null, key);
    }
    setAttributeNS(ns, name, value) {
      let attr = findWhere(this.attributes, createAttributeFilter(ns, name));
      if (!attr) this.attributes.push((attr = { ns, name }));
      attr.value = value;
      this._mutation();
    }
    getAttributeNS(ns, name) {
      let attr = findWhere(this.attributes, createAttributeFilter(ns, name));
      return attr && attr.value;
    }
    removeAttributeNS(ns, name) {
      splice(this.attributes, createAttributeFilter(ns, name));
      this._mutation();
    }
  }

  class Document extends Element {
    constructor() {
      super(9, "#document"); // DOCUMENT_NODE
    }
  }

  function createElement(type) {
    return new Element(null, String(type).toUpperCase());
  }

  function createElementNS(ns, type) {
    let element = createElement(type);
    element.namespace = ns;
    return element;
  }

  function createTextNode(text) {
    return new Text(text);
  }

  function createDocument() {
    let document = new Document();
    assign(
      document,
      (document.defaultView = {
        document,
        Document,
        Node,
        Text,
        Element,
        SVGElement: Element,
        Event,
      })
    );
    assign(document, { createElement, createElementNS, createTextNode });
    document.appendChild((document.documentElement = createElement("html")));

    document.documentElement.appendChild(
      (document.head = createElement("head"))
    );

    document.documentElement.appendChild(
      (document.body = createElement("body"))
    );

    return document;
  }

  return createDocument();
}
