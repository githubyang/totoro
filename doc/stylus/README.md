# stylus使用文档翻译
2015.03.10


# CSS样式语法

Stylus完全支持标准的CSS语法，意味着你不需要一个CSS编译器。

## 实例

Stylus里面缩进和空格是有特殊意义的，用来代替"{}"。
 
    border-radius()
      -webkit-border-radius arguments
      -moz-border-radius arguments
      border-radius arguments

    body a
      font 12px/1.4 "Lucida Grande", Arial, sans-serif
      background black
      color #ccc

    form input
      padding 5px
      border 1px solid
      border-radius 5px

Stylus里面括号，冒号，和分号是可选的，我们可以把这个例子写成类似我们正常的CSS：
 
    border-radius() {
      -webkit-border-radius: arguments;
      -moz-border-radius: arguments;
      border-radius: arguments;
    }

    body a {
      font: 12px/1.4 "Lucida Grande", Arial, sans-serif;
      background: black;
      color: #ccc;
    }

    form input {
      padding: 5px;
      border: 1px solid;
      border-radius: 5px;
    }

Stylus无法编译空格和缩进不规则的代码，比如下面这些：

    border-radius() {
      -webkit-border-radius: arguments;
      -moz-border-radius: arguments;
      border-radius: arguments;
    }

    body a
    {
      font: 12px/1.4 "Lucida Grande", Arial, sans-serif;
        background: black;
      color: #ccc;
    }

    form input {
      padding: 5px;
      border: 1px solid;
          border-radius: 5px;
    }



# 混合书写

定义函数 `border-radius(n)` .

    border-radius(n)
      -webkit-border-radius n
      -moz-border-radius n
      border-radius n

    form input[type=button]
      border-radius(5px)

编译之后:

    form input[type=button] {
      -webkit-border-radius: 5px;
      -moz-border-radius: 5px;
      border-radius: 5px;
    }

也支持省略掉括号但必须使用空格隔开:

    border-radius(n)
      -webkit-border-radius n
      -moz-border-radius n
      border-radius n

    form input[type=button]
      border-radius 5px

还可以利用自动参数进行多个值传递:

    border-radius()
      -webkit-border-radius arguments
      -moz-border-radius arguments
      border-radius arguments

使用如 `border-radius 1px 2px / 3px 4px`!

对私有前缀的支持:

        support-for-ie ?= true

        opacity(n)
          opacity n
          if support-for-ie
            filter unquote('progid:DXImageTransform.Microsoft.Alpha(Opacity=' + round(n * 100) + ')')

        #logo
          &:hover
            opacity 0.5

渲染:

        #logo:hover {
          opacity: 0.5;
          filter: progid:DXImageTransform.Microsoft.Alpha(Opacity=50);
        }

## 父级引用

 Mixins may utilize the parent reference character `&`, acting on the parent instead of further nesting. 
 
 For example, let's say we want to create a `stripe(even, odd)` mixin for striping table rows. We provide both `even` and `odd` with default color values, and assign the `background-color` property on the row. Nested within the `tr` we use `&` to reference the `tr`, providing the `even` color.
 
     stripe(even = #fff, odd = #eee)
       tr
         background-color odd
         &.even
         &:nth-child(even)
           background-color even

We may then utilize the mixin as shown below:

     table
       stripe()
       td
         padding 4px 10px

     table#users
       stripe(#303030, #494848)
       td
         color white

Alternatively, `stripe()` could be defined without parent references:

    stripe(even = #fff, odd = #eee)
      tr
        background-color odd
      tr.even
      tr:nth-child(even)
        background-color even

If we wished, we could invoke `stripe()` as if it were a property:

    stripe #fff #000

## Block mixins

You can pass blocks to mixins by calling mixin with `+` prefix:

    +foo()
      width: 10px

The passed block would be available inside the mixin as `block` variable, that then could be used with interpolation:

    foo()
      .bar
        {block}

    +foo()
      width: 10px

    => .bar {
         width: 10px;
       }

This feature is in its rough state ATM, but would be enhanced in the future.

## Mixing Mixins in Mixins

 Mixins can (of course!) utilize other mixins, building upon their own selectors and properties. 
 
 For example, below we create `comma-list()` to inline (via `inline-list()`) and comma-separate an unordered list.
 
 
     inline-list()
       li
         display inline

     comma-list()
       inline-list()
       li
         &:after
           content ', '
         &:last-child:after
           content ''

     ul
       comma-list()

Rendering:

    ul li:after {
      content: ", ";
    }
    ul li:last-child:after {
      content: "";
    }
    ul li {
      display: inline;
    }

# 变量

我们可以指定表达式为变量，然后在样式中代入:

     font-size = 14px

     body
       font font-size Arial, sans-serif

编译:

     body {
       font: 14px Arial, sans-serif;
     }

变量可以组成表达式列表:

    font-size = 14px
    font = font-size "Lucida Grande", Arial

    body
      font font, sans-serif

编译:

    body {
      font: 14px "Lucida Grande", Arial, sans-serif;
    }

标识符（变量名，函数，等等）也可能包含$字符。例如:

    $font-size = 14px
    body {
      font: $font-size sans-serif;
    }

## 属性查找

 Stylus有一个很酷的功能，就是可以直接引用属性定义的变量:

     #logo
       position: absolute
       top: 50%
       left: 50%
       width: w = 150px
       height: h = 80px
       margin-left: -(w / 2)
       margin-top: -(h / 2)

  不使用变量 `w` 和 `h`, 我们可以使用 `@`符号引用属性的值:

     #logo
       position: absolute
       top: 50%
       left: 50%
       width: 150px
       height: 80px
       margin-left: -(@width / 2)
       margin-top: -(@height / 2)

  其它的应用案列是有条件的定义属性，下面的例子中默认定义z-index为1:

      position()
        position: arguments
        z-index: 1 unless @z-index

      #logo
        z-index: 20
        position: absolute

      #logo2
        position: absolute

  属性查找会向上冒泡，如果没有找到会返回null:
  
      body
        color: red
        ul
          li
            color: blue
            a
              background-color: @color

# 插值

Stylus支持用`{}`包围表达式插入值,列如`-webkit-{'border' + '-radius'}` 等同于 `-webkit-border-radius`.

适用于私有前缀属性扩展

      vendor(prop, args)
        -webkit-{prop} args
        -moz-{prop} args
        {prop} args

      border-radius()
        vendor('border-radius', arguments)
      
      box-shadow()
        vendor('box-shadow', arguments)

      button
        border-radius 1px 2px / 3px 4px

编译后:

      button {
        -webkit-border-radius: 1px 2px / 3px 4px;
        -moz-border-radius: 1px 2px / 3px 4px;
        border-radius: 1px 2px / 3px 4px;
      }

## 选择器插值

插值可以用于选择器,列如为表格前5行指定高度:

    table
      for row in 1 2 3 4 5
        tr:nth-child({row})
          height: 10px * row

编译后:

    table tr:nth-child(1) {
      height: 10px;
    }
    table tr:nth-child(2) {
      height: 20px;
    }
    table tr:nth-child(3) {
      height: 30px;
    }
    table tr:nth-child(4) {
      height: 40px;
    }
    table tr:nth-child(5) {
      height: 50px;
    }
    
你可以将多个选择器组成字符串赋值给变量:

    mySelectors = '#foo,#bar,.baz'
    
    {mySelectors}
      background: #000

编译后:

    #foo,
    #bar,
    .baz {
      background: #000;
    }

