# 解析 一个js 包含 ng 的 代码 并读出其中的特定部分 单独生成文件夹 如 controller

## 使用

``` js
import parse from 'bq-js-ast'

parse({
  src: path.join(__dirname, './test.js'),
  dist: path.join(__dirname, './static')
})

```

> see `https://astexplorer.net/`
