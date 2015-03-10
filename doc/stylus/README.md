# stylus使用文档翻译
2015.03.10


---
layout: default
permalink: docs/css-style.html
---

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
