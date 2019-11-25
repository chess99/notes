# JavaScript引擎

## 如何编写优化的 JavaScript

1. **对象属性的顺序**：始终以相同的顺序实例化对象属性，以便可以共享隐藏的类和随后优化的代码。

2. **动态属**性： 因为在实例化之后向对象添加属性将强制执行隐藏的类更改，并降低之前隐藏类所优化的所有方法的执行速度，所以在其构造函数中分配所有对象的属性。

3. **方法**：重复执行相同方法的代码将比仅执行一次的多个不同方法（由于内联缓存）的代码运行得更快。

4. **数组**：避免稀疏数组，其中键值不是自增的数字，并没有存储所有元素的稀疏数组是哈希表。这种数组中的元素访问开销较高。另外，尽量避免预分配大数组。最好是按需增长。最后，不要删除数组中的元素，这会使键值变得稀疏。

5. **标记值**：V8 使用 32 位表示对象和数值。由于数值是 31 位的，它使用了一位来区分它是一个对象（flag = 1）还是一个称为 SMI（SMall Integer）整数（flag = 0）。那么，如果一个数值大于 31 位，V8会将该数字装箱，把它变成一个双精度数，并创建一个新的对象来存放该数字。尽可能使用 31 位有符号数字，以避免对 JS 对象的高开销的装箱操作。

    https://segmentfault.com/a/1190000017369465 



## 链接

how JavaScript works系列译文 <https://segmentfault.com/a/1190000017927665>  
how JavaScript works系列原文 <https://blog.sessionstack.com/how-does-javascript-actually-work-part-1-b0bacc073cf>  

推荐mathias（v8的开发者）的两篇文章：  
shapes和inline caches <https://mathiasbynens.be/notes/shapes-ics>  
v8是如何优化prototype的 <https://mathiasbynens.be/notes/prototypes>  
结论是在js代码中尽量不要修改prototype（如delete一个prototype），这样会导致整个原型链的invalid；从而导致v8在查找原型链上的属性时要使用原始的逐层往上查找的方法而不能使用偏移量查找。当原型链是valide时v8可以通过偏移量快速的找出查找属性。所以即使要更改prototype，也尽量在代码靠前位置修改  