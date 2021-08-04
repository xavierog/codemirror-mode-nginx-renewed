#!/usr/bin/env bash
# Requirements:
for tool in cat find grep mkdir sort xargs  curl git hg perl xqilla; do
	hash "${tool}" 2> /dev/null || { echo "Error: missing tool: ${tool}"; err=1; }
done
[ "${err}" ] && exit 250

# Functions:
function get {
	local url="${1}"
	local target_filename=$(echo "${url}"| md5sum)
	target_filename="${target_filename:0:32}"
	local target_path="${target_filename}.html"
	[ -f "${target_path}" ] || curl -s "${url}" > "${target_path}"
	cat "${target_path}"
}

function list_openresty_modules {
	local github_query_url='https://github.com/openresty?q=nginx-module&type=source&language=c&sort=name'
	get "${github_query_url}" | perl -nlE 'say $1 if m#/([^/]+-nginx-module)#' | sort -u
}

download_dir='download'
mkdir -p "${download_dir}"
cd "${download_dir}" || exit 150

# nginx itself:
[ -d 'nginx' ] || hg clone 'http://hg.nginx.org/nginx'
directories=('nginx/src')

# Openresty modules:
while read module; do
	[ -d "${module}" ] || git clone "https://github.com/openresty/${module}.git"
	directories+=("${module}/src")
done < <(list_openresty_modules)

# All nginx (not nginx-plus) directives, along with details on their acceptable scopes and arguments:
find "${directories[@]}" -type f -name '*.c' | perl -nlE '
	open($fh, $_);
	$contents = join(q[], <$fh>);
	while ($contents =~ m/(?x) # Extended mode
		# Part 1: token name
		# Example: { ngx_string("auth_basic"),
		\{
		\s*
		ngx_string\("
		(?<token>
			[a-z_0-9]+
		)
		"\),

		# Part 2: acceptable scopes for the token
		# Example: NGX_HTTP_MAIN_CONF|NGX_HTTP_SRV_CONF|NGX_HTTP_LOC_CONF|NGX_HTTP_LMT_CONF
		\s*
		(?<scopes>
			NGX_[A-Z_]+_CONF
			(?:\s*\|NGX_[A-Z_]+_CONF)*
		)

		# Part 3: number of arguments and flag block flags:
		(?<flags>
			(?:\s*\|NGX_CONF_[A-Z0-9]+)*
		)
		,

		# Part 4: handler function:
		# Example: ngx_http_set_complex_value_slot,
		\s*
		(?<handler>
			ngx_[a-z_0-9]+
		)
	/mg) {
		$token = $+{token}; $scopes = $+{scopes}; $flags = $+{flags}; $handler = $+{handler};
		$scopes =~ s#[\s\n\r]##g; $scopes =~ s#NGX_|_CONF##g;
		$flags =~ s#[\s\n\r]##g; $flags=~ s#NGX_CONF_|^\|##g;
		$type = ($handler =~ m#^ngx_conf_set_(.+)_slot$#) ? $1 : q[special];
		if (exists($tokens{$token})) {
			$tokens{$token}{q[scope]} .= q[|] . $scopes;
		} else {
			$tokens{$token} = {q[scope] => $scopes, q[flags] => $flags, q[type] => $type};
		}
	}
	close($fh);
	END {
		while (($token, $token_properties) = each(%tokens)) {
			$scopes = $token_properties->{q[scope]};
			# in practice, DIRECT is but a useless synonym of MAIN:
			$scopes =~ s/\|DIRECT//;
			say sprintf(q["%s": {scope: %s},], $token, $scopes);
		}
	}
' | sort > open-source-directives


# Get all documented nginx directives:
# 1 - fetch the nginx.org source code:
[ -d 'nginx.org' ] || hg clone 'http://hg.nginx.org/nginx.org'

# 2 - adjust ngx_http_api_module_head.xml to make it a complete XML file:
api_module_path='nginx.org/xml/en/docs/http/ngx_http_api_module_head.xml'
missing_tag='</module>'
grep -q "${missing_tag}" "${api_module_path}" || echo "${missing_tag}" >> "${api_module_path}"

# 3 - Extract directives and contexts from the XML files used to generate the nginx documentation:
directive_and_context_xquery='
	for $directive in
		/module/section[@id="directives"]/directive,
		$context in $directive//context
	return fn:concat(data($directive/@name), " ", data($context))'

find 'nginx.org/xml/en/docs' -type f -name '*.xml' | while read xml_filepath; do
	xqilla -i "${xml_filepath}" <(echo "${directive_and_context_xquery}") | while read directive context; do
		# Discard directives already found in source code:
		grep -qP "^\"${directive}\"" open-source-directives && continue
		echo "${directive} ${context} ${xml_filepath}"
	done
done | perl -naE '
	BEGIN {
		$all_known_scopes = {
			q[http] => {
				q[http] => q[HTTP_MAIN],
				q[server] => q[HTTP_SRV],
				q[location] => q[HTTP_LOC],
				q[if] => q[HTTP_SIF|HTTP_LIF],
				q[if in location] => q[HTTP_LIF],
				q[limit_except] => q[HTTP_LMT],
				q[upstream] => q[HTTP_UPS],
			},
			q[mail] => {
				q[mail] => q[MAIL_MAIN],
				q[server] => q[MAIL_SRV],
			},
			q[stream] => {
				q[stream] => q[STREAM_MAIN],
				q[server] => q[STREAM_SRV],
				q[upstream] => q[STREAM_UPS],
			},
		};
		%tokens = ();
	}
	($token, $context, $doc_path) = @F;

	$module_type = q[http];
	$module_type = $1 if ($doc_path =~ m/ngx_(http|mail|stream)/);
	$ngx_scope = $all_known_scopes->{$module_type}->{$context};

	if (exists($tokens{$token})) {
		$tokens{$token}->{q[scope]} .= q[|] . $ngx_scope;
	} else {
		$tokens{$token} = {q[scope] => $ngx_scope};
	}
	END {
		while (($token, $token_properties) = each(%tokens)) {
			$scopes = $token_properties->{q[scope]};
			# in practice, DIRECT is but a useless synonym of MAIN:
			$scopes =~ s/\|DIRECT//;
			say sprintf(q["%s": {scope: %s},], $token, $scopes);
		}
	}
' | sort > nginx-plus-directives

sort open-source-directives nginx-plus-directives

perl -nlE '
	$h{$1} = 1 if m#^== ngx\.([0-9a-z_.]+) ==#;
	$h{$1} = 1 if m#ngx\.([0-9A-Z_]+)#;
	END {
		map { printf(qq["%s", ], $_); } sort(keys(%h));
	}
' lua-nginx-module/doc/HttpLuaModule.wiki | sort -u > lua-directives
fold -s -w 100 lua-directives
