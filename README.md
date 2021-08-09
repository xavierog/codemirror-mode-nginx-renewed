# CodeMirror nginx renewed mode

This is a [CodeMirror](https://codemirror.net/) mode that provides syntax highlighting for nginx configuration files.
The "renewed" suffix is used to distinguish this mode from [CodeMirror's original nginx mode](https://codemirror.net/mode/nginx/index.html).
The latter is basically a quick and dirty fork of the CSS mode adjusted for nginx.
On the other hand, the nginx renewed mode was written from scratch with the intent of highlighting as many nginx directives as possible, but also various other things: regular expressions, variables in strings, IP addresses, MIME types, Lua blocks.
The nginx renewed mode also marks nginx directives as erroneous if they appear in the wrong scope (e.g. `proxy_pass` directly in an `http`/`server` block) -- if needed, this marking can be disabled.
Refer to the demo page for a complete list of features, MIME types and options.

## How to use
### Basic use
Load `nginx-renewed.js` at an adequate location in your HTML structure.
Mention `mode: 'nginx-renewed'` when creating your CodeMirror instance or, better, `mode: 'text/x-nginx-conf'`.

### Theming
This mode leverages CodeMirror's default tokens and should therefore fit in with all CodeMirror themes.
However, it optionally relies on codemirror-mode-pcre, which does NOT use these default tokens.
Consequently, CSS adjustments may be required for regular expressions to look good.

### Limitations
Sizes (e.g. "8k"), durations (e.g. "1h30m") and other numbers are not spotted as such and remain highlighted as regular strings.

## License
This mode is released under the 3-clause BSD license.
