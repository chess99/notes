# pixel

hardware physical pixels 设备物理像素, 比如1920*1080

 

DIP device independent pixel 设备无关像素

好像就是别处说的CSS像素

 

DPR device pixel ratio = physical pixels / DIP

通过window.devicePixelRatio获取

 

浏览器不是根据hardware pixels工作的, 而是根据DIP

https://classroom.udacity.com/courses/ud893/lessons/3494350031/concepts/34951290240923

 

# viewport

以下三种viewport非标准定义, 但是便于理解

## **layout viewport**

如果把移动设备上浏览器的可视区域设为viewport的话，某些网站就会因为viewport太窄而显示错乱，

所以这些浏览器就决定默认情况下把viewport设为一个较宽的值，比如980px，

这样的话即使是那些为桌面设计的网站也能在移动浏览器上正常显示了。

 

浏览器渲染内容时是以layout viewport值为准, 定义的是浏览器可以显示内容的区域

meta viewport设置的的layout viewport

当未提供meta viewport时, 浏览器会自己决定viewport值:

每个浏览器都不同。iPhone上的Safari使用980px、Opera 850px，安卓的Webkit核心800px，IE974px.

**(****安卓****9, chrome78,** **实测****980px)**

 

layoutviewport宽度通常保持不变。

如果你旋转你的手机，visualviewport改变，但浏览器会缩放页面以自适应，以达到layoutviewport再次和visualviewport同样宽

(实测横屏时, 所谓的layout viewport也变了)

 

通过 document.documentElement.clientWidth 获取

**document. documentElement. clientWidth/Height**

· 含义：layoutviewport尺寸

· 度量：CSS的pixels

· 完整支持：Opera, iPhone, Android, Symbian, Bolt, MicroB, Skyfire, Obigo

· 问题：在Iris上它标示visualvieport

 

· 三星的Webkit核心浏览器，仅当在页面上写入``标签，才正确表示。否则就代表着

· FireFox以设备的pixels来度量

· IE返回1024 x 768 px，而准确的尺寸保存在document.body.clientWidth/Height

· NetFront仅当100%缩放时候才正确

· 塞班的Webkit1(在S60v3设备)不支持这些属性

· 不支持：黑莓 

 

布局时,元素尺寸最好用相对单位. 

若用固定单位, 元素尺寸有可能超过viewport, 产生滚动条

## *visual viewport*

实际内容可视区域 (可能被内容撑宽, 超过layout viewport)

 

随着用户缩放浏览器，这值会改变，更多、更少的CSS pixels放进了屏幕

(未验证)

 

通过window.innerWidth 获取,  Android 2, Oprea mini 和 UC 8中无法正确获取

**window.innerWidth/Height**

· 含义：visualviewport尺寸

· 度量：CSS的pixels

· 完整支持：iPhone, Symbian, BlackBerry

· 问题：

· FireFox和Opera以设备的pixels返回该数值

· Android, Bolt, MicroB, 和 NetFront 以CSS的pixels返回该数值，且为layoutviewport的值

· 不支持：

· IE，它使用document. documentElement. offsetWidh/Height来表示

· 三星的Webkit核心浏览器，仅当在页面上写入``标签，才正确表示。否则就代表着``的尺寸

· 混乱：Iris, Skyfire, Obigo返回的值不知所云 

 

## **ideal viewport**

浏览器弄的屏幕宽度的像素值

在进行移动设备网站的开发时，我们需要的是ideal viewport

所有的iphone的ideal viewport宽度都是320px, 安卓设备比较复杂, 可在以下网站查询: http://viewportsizes.com

 

<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">

`width`属性控制视口的宽度。可以像width=600这样设为确切的像素数，或者设为device-width这一特殊值来指代比例为100%时屏幕宽度的CSS像素数值。（相应有`height`及`device-height`属性，可能对包含基于视口高度调整大小及位置的元素的页面有用。）

 

initial-scale属性控制页面最初加载时的缩放等级。maximum-scale、minimum-scale及user-scalable属性控制允许用户以怎样的方式放大或缩小页面。

 

 

**在****iphone****和****ipad****上，无论你给****viewport****设的宽度是多少，如果没有指定默认的缩放值，则****iphone****和****ipad****会自动计算这个缩放值，以达到当前页面不会出现横向滚动条****(****或者说****viewport****的宽度就是屏幕的宽度****)****的目的。**

 

 

 

## viewport的meta标签

https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/meta

https://developer.mozilla.org/zh-CN/docs/Mobile/Viewport_meta_tag

 

<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">

它提供有关视口初始大小的提示，仅供移动设备使用。设置的是layoutviewport的宽度.

 

width属性控制视口的宽度。

可以像width=600这样设为确切的像素数，或者设为device-width这一特殊值.

 

device-width

指代比例为100%时屏幕宽度的CSS像素数值, 即设备的DIP , 即screen.width.

但实际可能并不是真实的屏幕像素值, 时常会是320px。

 

相应有height及device-height属性，可能对包含基于视口高度调整大小及位置的元素的页面有用。

 

initial-scale属性控制页面最初加载时的缩放等级。maximum-scale、minimum-scale及user-scalable属性控制允许用户以怎样的方式放大或缩小页面。

initial-scale=1 设置DIP与CSS pixel的比为1:1, 同时保证换成横屏时会重新调整缩放

https://classroom.udacity.com/courses/ud893/lessons/3494350031/concepts/35764085970923

 

 

 

| **值的内容为：** **** |                                    |                                                              |
| --------------------- | ---------------------------------- | ------------------------------------------------------------ |
| **Value**             | **可能值**                         | **描述**                                                     |
| width                 | 一个正整数或者字符串 device-width  | 以pixels（像素）为单位，  定义viewport（视口）的宽度。       |
| height                | 一个正整数或者字符串 device-height | 以pixels（像素）为单位，  定义viewport（视口）的高度。       |
| initial-scale         | 一个0.0 到10.0之间的正数           | 定义设备宽度（纵向模式下的设备宽度或横向模式下的设备高度）与视口大小之间的缩放比率。 |
| maximum-scale         | 一个0.0 到10.0之间的正数           | 定义缩放的最大值；它必须大于或等于minimum-scale的值，不然会导致不确定的行为发生。 |
| minimum-scale         | 一个0.0 到10.0之间的正数           | 定义缩放的最小值；它必须小于或等于maximum-scale的值，不然会导致不确定的行为发生。 |
| user-scalable         | 一个布尔值（yes或者no）            | 如果设置为 no，用户将不能放大或缩小网页。默认值为 yes。      |

 

通过setAttribute来动态改变 

<meta id="testViewport" name="viewport" content="width = 380">

<script>

var mvp = document.getElementById('testViewport');

mvp.setAttribute('content','width=480');

</script>

 

## @viewport

https://developer.mozilla.org/zh-CN/docs/Web/CSS/@viewport

 

## 参考链接

“三种viewport” https://www.cnblogs.com/2050/p/3877280.html

优达学城viewport https://classroom.udacity.com/courses/ud893/lessons/3494350031/concepts/34932093360923

viewports剖析@大漠  https://www.w3cplus.com/css/viewports.html

 

## 实测结果..

没设置meta viewport时, 横屏时依然980

 <!-- <meta name="viewport" content="width=device-width, initial-scale=1"> -->

![img](G:\__my_projects\notes\mobile_web\assets\clip_image002.jpg) 

 

 

设置了meta viewport为device-width时, 横屏时跟随改变

  <meta name="viewport" content="width=device-width, initial-scale=1">

![img](G:\__my_projects\notes\mobile_web\assets\clip_image004.jpg)

 

没有initilal-scale结果一样

  <meta name="viewport" content="width=device-width">

![img](G:\__my_projects\notes\mobile_web\assets\clip_image006.jpg)

 