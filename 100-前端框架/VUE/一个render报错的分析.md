一个有点意思的报错, 深挖一下

<!-- TOC -->

- [错误复现](#错误复现)
- [不报错情形](#不报错情形)
- [报错原因分析](#报错原因分析)
- [不报错情形分析](#不报错情形分析)
- [关于命名规范](#关于命名规范)
- [扩展阅读](#扩展阅读)

<!-- /TOC -->

## 错误复现

当前环境

```
"vue": "^2.5.17"
"@babel/core": "^7.0.0",
"@babel/parser": "7.7.5",
"babel-plugin-import": "^1.11.0",
"@vue/babel-preset-jsx": "^1.1.1",
```



随便import一个组件为 `render` , 然后在 `render()` 函数中使用, 报错

```vue
<script type="text/jsx">
  import render from './list'

  export default {
    components: {
      render
    },

    render () {
      // console.log('render', render)
      return <render>1111</render>
    }
  }
</script>
```



## 不报错情形

不报错情形1:  import 为 `render` , 在模板语法`<template>` 内使用

不报错情形2: import 为 `Render` , JSX中写为 `<render>` 或 `<Render>` 都不报错

```vue
<script type="text/jsx">
  import Render from './list'

  export default {
    components: {
      Render
    },
    
    ....
```

不报错情形3: import 为 `render` 但是加了console.log

```vue
    render () {
      console.log('render', render)
      return <render>1111</render>
    }
```



## 报错原因分析

错误报告里说, import 为 "render", 在模板语法里使用不报错, 在 JSX 里报错  



直觉觉得可能因为组件名和 render 函数同名有关, 但是到底是发生在哪里呢  
首先组件命名为 "render" 是不推荐的写法, 根据官方风格指南, "组件名应该始终是多个单词", 换成 RenderFooo 试试, 没有报错了, 换成 Render 试试, 也没报错  
想看看 import 为 "render" 时, render 函数里的 "render" 成了什么, 加了个打印语句, 神奇的事情发生了, 不报错了, 打印出来的 render 是一个 VueComponent   



打断点调试, 报错的时候, 传递给 h 函数的第一个参数成了 render 函数

![image-20200208004542213](一个render报错的分析.assets/image-20200208004542213.png)



这个参数本该是一个 VueComponent 或者一个字符串  
是 VueComponent 就直接用, 是字符串就去 components 中找  

![image-20200208151843527](一个render报错的分析.assets/image-20200208151843527.png)



查看相关源码经过 Webpack 处理后的代码  

```JavaScript
/* harmony import */ var _list__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./list */ "./src/pages/tenant/list.vue");

/* harmony default export */ __webpack_exports__["default"] = ({
  components: {
    render: _list__WEBPACK_IMPORTED_MODULE_2__["default"]
  },
  render: function render() {
    var h = arguments[0];
    // console.log('render', render)
    return h(render, ["1111"]);
  }
});//# sourceURL=[module]
```



执行时, h 函数的第一个参数 render, 找到了 function "render", render函数被当作了 Ctor  
找不到Ctor.options.props 所以报错了 ( 此处正经的 Ctor 应该是一个 VueComponent ) :  

 ![img](一个render报错的分析.assets/extractPropsFromVNodeData.png) 



那么为什么 Webpack 处理后的代码是这样的呢  
[官方文档]( https://cn.vuejs.org/v2/guide/render-function.html#JSX ) 里提到, "有一个 [Babel 插件](https://github.com/vuejs/jsx)，用于在 Vue 中使用 JSX 语法"  
查看相关源码, 编译时通过 babel-plugin-transform-vue-jsx 把 JSXElement 转换成 h函数调用  

具体对 "tag" 的处理:  
作用域中找得到就当作变量  
作用域中找不到就当作字符串  
(这个 "tag" 后面被作为 createElement 的第一个参数)  

相关代码:

![image-20200208005531837](一个render报错的分析.assets/image-20200208005531837.png)

<https://github.com/vuejs/jsx/blob/dev/packages/babel-plugin-transform-vue-jsx/src/index.js#L45>  

报错的情形中, 编译时作用域中有 import 进来的变量 render, 编译成传 render 变量.  
编译时作用域中没有 render 变量时, 处理成字符串:

```JavaScript
  render: function render() {
    var h = arguments[0];
    // console.log('render', render)
    return h("render", ["1111"]);
  }
```



## 不报错情形分析

不报错情形1: `<template>` 直接由 [vue-loader]( https://github.com/vuejs/vue-loader/blob/master/lib/loaders/templateLoader.js ) - [vue-template-compiler]( https://github.com/vuejs/vue/tree/dev/packages/vue-template-compiler ) 处理成render函数了, 没有经过 `babel-plugin-transform-vue-jsx` 的处理

不报错情形2: 因为作用域中没有了 `render`, 所以处理成了 `h("render", ["1111"])`  



不报错情形3还要继续挖  
其 Webpack 处理结果:

```JavaScript
/* harmony import */ var _list__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./list */ "./src/pages/tenant/list.vue");

/* harmony default export */ __webpack_exports__["default"] = ({
  components: {
    render: _list__WEBPACK_IMPORTED_MODULE_0__["default"]
  },
  render: function render() {
    var h = arguments[0];
    console.log("render", _list__WEBPACK_IMPORTED_MODULE_0__["default"]);
    return h("render", ["1111"]);
  }
});//# sourceURL=[module]
```

是字符串的 "render", 所以在到达 babel-plugin-transform-vue-jsx 内 `path.scope.hasBinding(name)` 这里应该是 false 了, 但为什么是false  
在 `path.scope.hasBinding(name)` 打个条件断点看看  
当有 console.log 时, import 的变量名处理成了 "_render",  
没有 console.log 时, 是 "render" 没有变  

![image-20200208183416549](一个render报错的分析.assets/image-20200208183416549.png)

在 babel 某一个 plugin 被处理成 "_render"  

![image-20200208194721556](一个render报错的分析.assets/image-20200208194721556.png)

@babel/core/lib/transformation/index.js  
在 `transformFile` 函数里下条件断点 `file.opts.filename` 停到关注的文件  
`file.ast` 经过每个 plugin 里的 visitor 处理变形  

```javascript
(0, _traverse().default)(file.ast, visitor, file.scope);
```

@babel/traverse/lib/index.js

```JavaScript
traverse.node = function (node, opts, scope, state, parentPath, skipKeys) {
  const keys = t.VISITOR_KEYS[node.type];
  if (!keys) return;
  const context = new _context.default(scope, opts, state, parentPath);

  for (const key of keys) {
    if (skipKeys && skipKeys[key]) continue;
    if (context.visit(node, key)) return;
  }
};
```

@babel/traverse/lib/context.js

```javascript
  visit(node, key) {
    const nodes = node[key];
    if (!nodes) return false;

    if (Array.isArray(nodes)) {
      return this.visitMultiple(nodes, node, key);
    } else {
      return this.visitSingle(node, key);
    }
  }
```

具体是哪个 plugin 把它变成了 "_render" 以及因为什么, 还没有找到, 等有空继续..



## 关于命名规范

根据官方风格指南, 组件名应该使用多个单词, 可以避免命名冲突的问题  
这个栗子中, 组件最好命名为 RenderFooooo, 也就不会出现这个报错了  



>  **组件名应该始终是多个单词的，根组件 `App` 以及 `<transition>`、`<component>` 之类的 Vue 内置组件除外。** 
>
>  
>
>  **[单文件组件](https://cn.vuejs.org/v2/guide/single-file-components.html)的文件名应该要么始终是单词大写开头 (PascalCase)，要么始终是横线连接 (kebab-case)** 
>
>  
>
>   **应用特定样式和约定的基础组件 (也就是展示类的、无逻辑的或无状态的组件) 应该全部以一个特定的前缀开头，比如 `Base`、`App` 或 `V`。** 
>
>  
>
>   **和父组件紧密耦合的子组件应该以父组件名作为前缀命名。** 
>
>  
>
>   **对于绝大多数项目来说，在[单文件组件](https://cn.vuejs.org/v2/guide/single-file-components.html)和字符串模板中组件名应该总是 PascalCase 的——但是在 DOM 模板中总是 kebab-case 的。** 
>
>  
>
>   **JS/[JSX](https://cn.vuejs.org/v2/guide/render-function.html#JSX) 中的组件名应该始终是 PascalCase 的，尽管在较为简单的应用中只使用 `Vue.component` 进行全局组件注册时，可以使用 kebab-case 字符串。** 



详见文档: <https://cn.vuejs.org/v2/style-guide/index.html>  



## 扩展阅读

Babel总览  
<http://www.alloyteam.com/2017/04/analysis-of-babel-babel-overview/>   



 Babel 插件手册  
 <https://github.com/jamiebuilds/babel-handbook/blob/master/translations/zh-Hans/plugin-handbook.md>  