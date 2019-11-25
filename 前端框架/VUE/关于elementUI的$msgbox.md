# 关于elementUI的$msgbox

以下两种render写法都是响应式的
相关文档: <https://cn.vuejs.org/v2/guide/render-function.html>

```html
<script>
export default {
  data() {
    return {
      count: 1
    }
  },
  created() {
    setInterval(() => this.count++, 1000)
  },
  render(createElement, context) {
    return createElement('div', {
      domProps: {
        innerHTML: this.count
      }
    })
  },
  render(createElement, context) {
    return createElement('div', null, this.count)
  }
}
</script>
```

以下使用element-ui的代码不是响应式的

```JavaScript
      const h = this.$createElement
      this.$msgbox({
        title: 'xxx',
        message: h('div', null, this.count)
      })
```

MessageBox的instance是在调用接口时获取或创建, 是一个singleton, 它是响应式的
$msgbox传入的options, 如果options.message是一个VNode, 会被塞到到instance的slot里,
这里只是一个VNode, 不是一个Vue实例, 没有进行过依赖收集

在底层实现中Vue会将模板编译成render()函数
> 如果 render 函数和 template 属性都不存在，挂载 DOM 元素的 HTML 会被提取出来用作模板，此时，必须使用 Runtime + Compiler 构建的 Vue 库
(<https://cn.vuejs.org/v2/api/#el>)

> 每个组件实例都对应一个 watcher 实例，它会在组件渲染的过程中把“接触”过的数据属性记录为依赖。
> 之后当依赖项的 setter 触发时，会通知 watcher，从而使它关联的组件重新渲染
(<https://cn.vuejs.org/v2/guide/reactivity.html>)  

依赖收集的过程:
<https://github.com/answershuto/learnVue/blob/master/docs/%E4%BE%9D%E8%B5%96%E6%94%B6%E9%9B%86.MarkDown>

"重新渲染":  
缓冲在同一事件循环中发生的所有数据变更, 去重
调用render()函数渲染出一个新的VNode, VNode与oldVNode进行diff, 然后patch更新DOM


element-ui $msgbox相关源码:

```JavaScript
// $msgbox的来源
// element/src/index.js

  Vue.prototype.$ELEMENT = {
    size: opts.size || '',
    zIndex: opts.zIndex || 2000
  };

  Vue.prototype.$loading = Loading.service;
  Vue.prototype.$msgbox = MessageBox;
  Vue.prototype.$alert = MessageBox.alert;
  Vue.prototype.$confirm = MessageBox.confirm;
  Vue.prototype.$prompt = MessageBox.prompt;
  Vue.prototype.$notify = Notification;
  Vue.prototype.$message = Message;
```

```JavaScript
// MessageBox的实现
// element\packages\message-box\src\main.js

    // ...
    return new Promise((resolve, reject) => {
      msgQueue.push({
        options: merge({}, defaults, MessageBox.defaults, options),
        callback: callback,
        resolve: resolve,
        reject: reject
      });

      showNextMsg();
    });
```

```JavaScript
const showNextMsg = () => {
  if (!instance) {
    initInstance();
  }
  instance.action = '';

  if (!instance.visible || instance.closeTimer) {
    if (msgQueue.length > 0) {
      currentMsg = msgQueue.shift();

      let options = currentMsg.options;
      for (let prop in options) {
        if (options.hasOwnProperty(prop)) {
          instance[prop] = options[prop];
        }
      }
      if (options.callback === undefined) {
        instance.callback = defaultCallback;
      }

      let oldCb = instance.callback;
      instance.callback = (action, instance) => {
        oldCb(action, instance);
        showNextMsg();
      };
      if (isVNode(instance.message)) {
        instance.$slots.default = [instance.message];
        instance.message = null;
      } else {
        delete instance.$slots.default;
      }
      ['modal', 'showClose', 'closeOnClickModal', 'closeOnPressEscape', 'closeOnHashChange'].forEach(prop => {
        if (instance[prop] === undefined) {
          instance[prop] = true;
        }
      });
      document.body.appendChild(instance.$el);

      Vue.nextTick(() => {
        instance.visible = true;
      });
    }
  }
};
```
