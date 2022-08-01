[![Build Status](https://travis-ci.org/felixrieseberg/sanitize-xml-string.svg?branch=master)](https://travis-ci.org/felixrieseberg/sanitize-xml-string)
[![MIT license](http://img.shields.io/badge/license-MIT-brightgreen.svg)](http://opensource.org/licenses/MIT)

# sanitize-xml-string
Not all UTF-8 characters are valid in XML. This module offers two methods, `sanitize` and `validate`, that treat a given string and prepare it for use with XML. Valid characters were taken from https://www.w3.org/TR/xml11/#charsets, which includes any Unicode character, excluding the surrogate blocks, FFFE, and FFFF (`[#x1-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]`).

> :warning: To deal with emoji and other special unicode use cases, ES6 added a `u` flag to regular expressions. This tiny module uses that flag - if you do not use ES6, you might run into where valid unicode pairs are identified as invalid individual points and thus removed. For more information, read this: https://mathiasbynens.be/notes/javascript-unicode

# License
MIT, please see LICENSE for details.
