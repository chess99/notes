

virtual DOM的由来及概念

<https://www.jianshu.com/p/bef1c1ee5a0e>
<http://teropa.info/blog/2015/03/02/change-and-its-detection-in-javascript-frameworks.html>

 

virtual DOM算法

<https://github.com/livoras/blog/issues/13>

两个树的完全的 diff 算法是一个时间复杂度为 O(n^3) 的问题。但是在前端当中，你很少会跨越层级地移动DOM元素。

所以 Virtual DOM 只会对同一个层级的元素进行对比

![img](.\assets\virtual-dom-diff.png)

差异类型:

1替换掉原来的节点，例如把上面的div换成了section

2移动、删除、新增子节点，例如上面div的子节点，把p和ul顺序互换

3修改了节点的属性

4对于文本节点，文本内容可能会改变

 

如果把div的子节点重新排序, 例如p, ul, div的顺序换成了div, p, ul。

如果按照同层级进行顺序对比的话，它们都会被替换掉。如p和div的tagName不同，p会被div所替代。最终，三个节点都会被替换，这样DOM开销就非常大。

而实际上是不需要替换节点，而只需要经过节点移动就可以达到，我们只需知道怎么进行移动.

这个问题抽象出来其实是字符串的最小编辑距离问题（[Edition Distance](https://en.wikipedia.org/wiki/Edit_distance)），最常见的解决算法是 [Levenshtein Distance](https://en.wikipedia.org/wiki/Levenshtein_distance)，通过动态规划求解，时间复杂度为 O(M * N)。

但是我们并不需要真的达到最小的操作，我们只需要优化一些比较常见的移动情况，牺牲一定DOM操作，让算法时间复杂度达到线性的（O(max(M, N))。

详见代码https://github.com/livoras/list-diff/blob/master/lib/diff.js

 

**Vue****中的virtual DOM**

https://cloud.tencent.com/developer/article/1455054

![img](.\assets\virtual-dom-vue.png)

**渲染函数**：渲染函数是用来生成Virtual DOM的。Vue推荐使用模板来构建我们的应用界面，在底层实现中Vue会将模板编译成渲染函数，当然我们也可以不写模板，直接写渲染函数，以获得更好的控制。

**VNode** **虚拟节点**：它可以代表一个真实的 dom 节点。通过 createElement 方法能将 VNode 渲染成 dom 节点。简单地说，vnode可以理解成节点描述对象，它描述了应该怎样去创建真实的DOM节点。

**patch**(也叫做patching算法)：虚拟DOM最核心的部分，它可以将vnode渲染成真实的DOM，这个过程是对比新旧虚拟节点之间有哪些不同，然后根据对比结果找出需要更新的的节点进行更新。这点我们从单词含义就可以看出， patch本身就有补丁、修补的意思，其实际作用是在现有DOM上进行修改来实现更新视图的目的。Vue的Virtual DOM Patching算法是基于[Snabbdom](https://links.jianshu.com/go?to=https%3A%2F%2Fgithub.com%2Fsnabbdom%2Fsnabbdom)的实现，并在些基础上作了很多的调整和改进。

## xxx

简单讲了vdom优势
https://vuejsdevelopers.com/2017/02/21/vue-js-virtual-dom/

稍微深入一些的原理
https://medium.com/@koheimikami/understanding-rendering-process-with-virtual-dom-in-vue-js-a6e602811782

直接更新DOM代价比较高
virtual dom
缓存变化，一次更新
避免不必要的更新，比如前后数据没变
(如何对比识别vdom上哪些需要更新至dom )
watcher被缓存到queue

render函数
https://vuejs.org/v2/guide/render-function.html

比较详细的vnode过程
https://segmentfault.com/a/1190000008291645
https://www.cnblogs.com/fundebug/p/vue-virtual-dom.html

vdom diff
https://www.jianshu.com/p/af0b398602bc

关于vdom的性能
https://www.cnblogs.com/chengxs/p/11096747.html