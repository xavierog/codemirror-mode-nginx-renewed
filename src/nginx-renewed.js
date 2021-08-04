CodeMirror.defineMode("nginx-renewed", function(editor_options) {
	var
		ANY         =      1, // anywhere (basically: "include")
		MAIN        =      2, // main configuration level; skipping "DIRECT" on purpose here
		EVENT       =      4, // events {}
		HTTP_MAIN   =      8, // http {}
		HTTP_SRV    =     16, // http { server {}}
		HTTP_LOC    =     32, // http { server { location {}}}
		HTTP_LIF    =     64, // http { server { location { if () {}}}}
		HTTP_LMT    =    128, // http { server { location { limit_except () {}}}}
		HTTP_SIF    =    256, // http { server { if () {}}}
		HTTP_UPS    =    512, // http { upstream {}}
		MAIL_MAIN   =   1024, // mail {}
		MAIL_SRV    =   2048, // mail { server {}}
		STREAM_MAIN =   4096, // stream {}
		STREAM_SRV  =   8192, // stream { server {}}
		STREAM_UPS  =  16384, // stream { upstream {}}
		/* unofficial scopes: */
		HTTP_GEO    =  32768, // http { geo {}}
		STREAM_GEO  =  65536, // stream { geo {}}
		MAP         = 131072, // http { map {}} or stream { map {}}
		TYPES       = 262144; // http { types {}}

	var blocks_to_scope = {
		'main': MAIN,
		'main/events': EVENT,
		'main/http': HTTP_MAIN,
		'main/http/server': HTTP_SRV,
		'main/http/server/location': HTTP_LOC,
		'main/http/server/location/if': HTTP_LIF,
		'main/http/server/location/limit_except': HTTP_LMT,
		'main/http/server/if': HTTP_LIF,
		'main/http/upstream': HTTP_UPS,
		'main/mail': MAIL_MAIN,
		'main/mail/server': MAIL_SRV,
		'main/stream': STREAM_MAIN,
		'main/stream/server': STREAM_SRV,
		'main/stream/upstream': STREAM_UPS,
		'main/http/geo': HTTP_GEO,
		'main/stream/geo': STREAM_GEO,
		'main/http/map': MAP,
		'main/stream/map': MAP,
		'main/http/types': TYPES,
		'main/http/server/types': TYPES,
		'main/http/server/location/types': TYPES,
	};

	var known_directives = {
		"absolute_redirect": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"accept_mutex": {scope: EVENT},
		"accept_mutex_delay": {scope: EVENT},
		"acceptex_read": {scope: EVENT},
		"access_by_lua": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"access_by_lua_block": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"access_by_lua_file": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"access_by_lua_no_postpone": {scope: HTTP_MAIN},
		"access_log": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|HTTP_LMT|STREAM_MAIN|STREAM_SRV},
		"add_after_body": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"add_before_body": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"add_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"add_trailer": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"addition_types": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"aio": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"aio_write": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"alias": {scope: HTTP_LOC},
		"allow": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LMT|STREAM_MAIN|STREAM_SRV},
		"ancient_browser": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"ancient_browser_value": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"api": {scope: HTTP_LOC|HTTP_LOC},
		"array_join": {scope: HTTP_MAIN|HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"auth_basic": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LMT},
		"auth_basic_user_file": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LMT},
		"auth_delay": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"auth_http": {scope: MAIL_MAIN|MAIL_SRV},
		"auth_http_header": {scope: MAIL_MAIN|MAIL_SRV},
		"auth_http_pass_client_cert": {scope: MAIL_MAIN|MAIL_SRV},
		"auth_http_timeout": {scope: MAIL_MAIN|MAIL_SRV},
		"auth_jwt": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LMT},
		"auth_jwt_claim_set": {scope: HTTP_MAIN},
		"auth_jwt_header_set": {scope: HTTP_MAIN},
		"auth_jwt_key_file": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LMT},
		"auth_jwt_key_request": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LMT},
		"auth_jwt_leeway": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"auth_jwt_type": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LMT},
		"auth_request": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"auth_request_set": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"autoindex": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"autoindex_exact_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"autoindex_format": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"autoindex_localtime": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"balancer_by_lua_block": {scope: HTTP_UPS|STREAM_UPS},
		"balancer_by_lua_file": {scope: HTTP_UPS|STREAM_UPS},
		"body_filter_by_lua": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"body_filter_by_lua_block": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"body_filter_by_lua_file": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"break": {scope: HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"charset": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"charset_map": {scope: HTTP_MAIN},
		"charset_types": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"chunked_transfer_encoding": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"client_body_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"client_body_in_file_only": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"client_body_in_single_buffer": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"client_body_temp_path": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"client_body_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"client_header_buffer_size": {scope: HTTP_MAIN|HTTP_SRV},
		"client_header_timeout": {scope: HTTP_MAIN|HTTP_SRV},
		"client_max_body_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"connection_pool_size": {scope: HTTP_MAIN|HTTP_SRV},
		"content_by_lua": {scope: HTTP_LOC|HTTP_LIF|STREAM_SRV},
		"content_by_lua_block": {scope: HTTP_LOC|HTTP_LIF|STREAM_SRV},
		"content_by_lua_file": {scope: HTTP_LOC|HTTP_LIF|STREAM_SRV},
		"create_full_put_path": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"daemon": {scope: MAIN},
		"dav_access": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"dav_methods": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"debug_connection": {scope: EVENT},
		"debug_points": {scope: MAIN},
		"default_type": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"degradation": {scope: HTTP_MAIN},
		"degrade": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"deny": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LMT|STREAM_MAIN|STREAM_SRV},
		"devpoll_changes": {scope: EVENT},
		"devpoll_events": {scope: EVENT},
		"directio": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"directio_alignment": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"disable_symlinks": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"drizzle_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"drizzle_connect_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"drizzle_dbname": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"drizzle_keepalive": {scope: HTTP_UPS},
		"drizzle_module_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"drizzle_pass": {scope: HTTP_LOC|HTTP_LIF},
		"drizzle_query": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"drizzle_recv_cols_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"drizzle_recv_rows_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"drizzle_send_query_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"drizzle_server": {scope: HTTP_UPS},
		"drizzle_status": {scope: HTTP_LOC|HTTP_LIF},
		"echo": {scope: HTTP_LOC|HTTP_LIF|STREAM_SRV},
		"echo_abort_parent": {scope: HTTP_LOC|HTTP_LIF},
		"echo_after_body": {scope: HTTP_LOC|HTTP_LIF},
		"echo_before_body": {scope: HTTP_LOC|HTTP_LIF},
		"echo_blocking_sleep": {scope: HTTP_LOC|HTTP_LIF},
		"echo_client_error_log_level": {scope: STREAM_MAIN|STREAM_SRV},
		"echo_discard_request": {scope: STREAM_SRV},
		"echo_duplicate": {scope: HTTP_LOC|HTTP_LIF|STREAM_SRV},
		"echo_end": {scope: HTTP_LOC|HTTP_LIF},
		"echo_exec": {scope: HTTP_LOC|HTTP_LIF},
		"echo_flush": {scope: HTTP_LOC|HTTP_LIF},
		"echo_flush_wait": {scope: STREAM_SRV},
		"echo_foreach_split": {scope: HTTP_LOC|HTTP_LIF},
		"echo_lingering_close": {scope: STREAM_MAIN|STREAM_SRV},
		"echo_lingering_time": {scope: STREAM_MAIN|STREAM_SRV},
		"echo_lingering_timeout": {scope: STREAM_MAIN|STREAM_SRV},
		"echo_location": {scope: HTTP_LOC|HTTP_LIF},
		"echo_location_async": {scope: HTTP_LOC|HTTP_LIF},
		"echo_read_buffer_size": {scope: STREAM_MAIN|STREAM_SRV},
		"echo_read_bytes": {scope: STREAM_SRV},
		"echo_read_line": {scope: STREAM_SRV},
		"echo_read_request_body": {scope: HTTP_LOC|HTTP_LIF},
		"echo_read_timeout": {scope: STREAM_MAIN|STREAM_SRV},
		"echo_request_body": {scope: HTTP_LOC|HTTP_LIF},
		"echo_request_data": {scope: STREAM_SRV},
		"echo_reset_timer": {scope: HTTP_LOC|HTTP_LIF},
		"echo_send_timeout": {scope: STREAM_MAIN|STREAM_SRV},
		"echo_sleep": {scope: HTTP_LOC|HTTP_LIF|STREAM_SRV},
		"echo_status": {scope: HTTP_LOC|HTTP_LIF},
		"echo_subrequest": {scope: HTTP_LOC|HTTP_LIF},
		"echo_subrequest_async": {scope: HTTP_LOC|HTTP_LIF},
		"empty_gif": {scope: HTTP_LOC},
		"encrypted_session_expires": {scope: HTTP_MAIN|HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"encrypted_session_iv": {scope: HTTP_MAIN|HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"encrypted_session_key": {scope: HTTP_MAIN|HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"env": {scope: MAIN},
		"epoll_events": {scope: EVENT},
		"error_log": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV|MAIN|MAIL_MAIN|MAIL_SRV},
		"error_page": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"etag": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"eventport_events": {scope: EVENT},
		"events": {scope: MAIN},
		"exit_worker_by_lua_block": {scope: HTTP_MAIN},
		"exit_worker_by_lua_file": {scope: HTTP_MAIN},
		"expires": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"f4f": {scope: HTTP_LOC},
		"f4f_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_bind": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_buffering": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_buffers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_busy_buffers_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_background_update": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_bypass": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_key": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_lock": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_lock_age": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_lock_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_max_range_offset": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_methods": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_min_uses": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_path": {scope: HTTP_MAIN},
		"fastcgi_cache_purge": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_revalidate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_use_stale": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_cache_valid": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_catch_stderr": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_connect_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_force_ranges": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_hide_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_ignore_client_abort": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_ignore_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_index": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_intercept_errors": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_keep_conn": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_limit_rate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_max_temp_file_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_next_upstream": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_next_upstream_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_next_upstream_tries": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_no_cache": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_param": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_pass": {scope: HTTP_LOC|HTTP_LIF},
		"fastcgi_pass_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_pass_request_body": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_pass_request_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_read_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_request_buffering": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_send_lowat": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_send_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_socket_keepalive": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_split_path_info": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_store": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_store_access": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_temp_file_write_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"fastcgi_temp_path": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"flv": {scope: HTTP_LOC},
		"geo": {scope: HTTP_MAIN|STREAM_MAIN},
		"geoip_city": {scope: HTTP_MAIN|STREAM_MAIN},
		"geoip_country": {scope: HTTP_MAIN|STREAM_MAIN},
		"geoip_org": {scope: HTTP_MAIN|STREAM_MAIN},
		"geoip_proxy": {scope: HTTP_MAIN},
		"geoip_proxy_recursive": {scope: HTTP_MAIN},
		"google_perftools_profiles": {scope: MAIN},
		"grpc_bind": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_connect_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_hide_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ignore_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_intercept_errors": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_next_upstream": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_next_upstream_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_next_upstream_tries": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_pass": {scope: HTTP_LOC|HTTP_LIF},
		"grpc_pass_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_read_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_send_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_set_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_socket_keepalive": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_certificate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_certificate_key": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_ciphers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_conf_command": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_crl": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_name": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_password_file": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_protocols": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_server_name": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_session_reuse": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_trusted_certificate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_verify": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"grpc_ssl_verify_depth": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gunzip": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gunzip_buffers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gzip": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"gzip_buffers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gzip_comp_level": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gzip_disable": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gzip_hash": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gzip_http_version": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gzip_min_length": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gzip_no_buffer": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gzip_proxied": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gzip_static": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gzip_types": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gzip_vary": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"gzip_window": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"hash": {scope: HTTP_UPS|STREAM_UPS},
		"header_filter_by_lua": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"header_filter_by_lua_block": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"header_filter_by_lua_file": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"health_check": {scope: HTTP_LOC|STREAM_SRV},
		"health_check_timeout": {scope: STREAM_MAIN|STREAM_SRV},
		"hls": {scope: HTTP_LOC},
		"hls_buffers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"hls_forward_args": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"hls_fragment": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"hls_mp4_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"hls_mp4_max_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"http": {scope: MAIN},
		"http2_body_preread_size": {scope: HTTP_MAIN|HTTP_SRV},
		"http2_chunk_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"http2_idle_timeout": {scope: HTTP_MAIN|HTTP_SRV},
		"http2_max_concurrent_pushes": {scope: HTTP_MAIN|HTTP_SRV},
		"http2_max_concurrent_streams": {scope: HTTP_MAIN|HTTP_SRV},
		"http2_max_field_size": {scope: HTTP_MAIN|HTTP_SRV},
		"http2_max_header_size": {scope: HTTP_MAIN|HTTP_SRV},
		"http2_max_requests": {scope: HTTP_MAIN|HTTP_SRV},
		"http2_pool_size": {scope: HTTP_MAIN|HTTP_SRV},
		"http2_push": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"http2_push_preload": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"http2_recv_buffer_size": {scope: HTTP_MAIN},
		"http2_recv_timeout": {scope: HTTP_MAIN|HTTP_SRV},
		"http2_streams_index_size": {scope: HTTP_MAIN|HTTP_SRV},
		"if": {scope: HTTP_SRV|HTTP_LOC},
		"if_modified_since": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"ignore_invalid_headers": {scope: HTTP_MAIN|HTTP_SRV},
		"image_filter": {scope: HTTP_LOC},
		"image_filter_buffer": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"image_filter_interlace": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"image_filter_jpeg_quality": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"image_filter_sharpen": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"image_filter_transparency": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"image_filter_webp_quality": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"imap_auth": {scope: MAIL_MAIN|MAIL_SRV},
		"imap_capabilities": {scope: MAIL_MAIN|MAIL_SRV},
		"imap_client_buffer": {scope: MAIL_MAIN|MAIL_SRV},
		"include": {scope: ANY},
		"index": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"init_by_lua": {scope: HTTP_MAIN|STREAM_MAIN},
		"init_by_lua_block": {scope: HTTP_MAIN|STREAM_MAIN},
		"init_by_lua_file": {scope: HTTP_MAIN|STREAM_MAIN},
		"init_worker_by_lua": {scope: HTTP_MAIN|STREAM_MAIN},
		"init_worker_by_lua_block": {scope: HTTP_MAIN|STREAM_MAIN},
		"init_worker_by_lua_file": {scope: HTTP_MAIN|STREAM_MAIN},
		"internal": {scope: HTTP_LOC},
		"iocp_threads": {scope: EVENT},
		"ip_hash": {scope: HTTP_UPS},
		"js_access": {scope: STREAM_MAIN|STREAM_SRV},
		"js_body_filter": {scope: HTTP_LOC|HTTP_LMT},
		"js_content": {scope: HTTP_LOC|HTTP_LMT},
		"js_filter": {scope: STREAM_MAIN|STREAM_SRV},
		"js_header_filter": {scope: HTTP_LOC|HTTP_LMT},
		"js_import": {scope: HTTP_MAIN|STREAM_MAIN},
		"js_include": {scope: HTTP_MAIN|STREAM_MAIN},
		"js_path": {scope: HTTP_MAIN|STREAM_MAIN},
		"js_preread": {scope: STREAM_MAIN|STREAM_SRV},
		"js_set": {scope: HTTP_MAIN|STREAM_MAIN},
		"js_var": {scope: HTTP_MAIN|STREAM_MAIN},
		"keepalive": {scope: HTTP_UPS},
		"keepalive_disable": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"keepalive_requests": {scope: HTTP_UPS|HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"keepalive_time": {scope: HTTP_UPS|HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"keepalive_timeout": {scope: HTTP_UPS|HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"keyval": {scope: HTTP_MAIN|STREAM_MAIN},
		"keyval_zone": {scope: HTTP_MAIN|STREAM_MAIN},
		"kqueue_changes": {scope: EVENT},
		"kqueue_events": {scope: EVENT},
		"large_client_header_buffers": {scope: HTTP_MAIN|HTTP_SRV},
		"least_conn": {scope: HTTP_UPS|STREAM_UPS},
		"least_time": {scope: HTTP_UPS|STREAM_UPS},
		"limit_conn": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"limit_conn_dry_run": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"limit_conn_log_level": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"limit_conn_status": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"limit_conn_zone": {scope: HTTP_MAIN|STREAM_MAIN},
		"limit_except": {scope: HTTP_LOC},
		"limit_rate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"limit_rate_after": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"limit_req": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"limit_req_dry_run": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"limit_req_log_level": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"limit_req_status": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"limit_req_zone": {scope: HTTP_MAIN},
		"limit_zone": {scope: HTTP_MAIN},
		"lingering_close": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"lingering_time": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"lingering_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"listen": {scope: HTTP_SRV|STREAM_SRV|MAIL_SRV},
		"load_module": {scope: MAIN},
		"location": {scope: HTTP_SRV|HTTP_LOC},
		"lock_file": {scope: MAIN},
		"log_by_lua": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"log_by_lua_block": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|STREAM_MAIN|STREAM_SRV},
		"log_by_lua_file": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|STREAM_MAIN|STREAM_SRV},
		"log_format": {scope: HTTP_MAIN|STREAM_MAIN},
		"log_not_found": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"log_subrequest": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"lua_add_variable": {scope: STREAM_MAIN},
		"lua_capture_error_log": {scope: HTTP_MAIN|STREAM_MAIN},
		"lua_check_client_abort": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|STREAM_MAIN|STREAM_SRV},
		"lua_code_cache": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|STREAM_MAIN|STREAM_SRV},
		"lua_http10_buffering": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"lua_load_resty_core": {scope: HTTP_MAIN|STREAM_MAIN},
		"lua_malloc_trim": {scope: HTTP_MAIN|STREAM_MAIN},
		"lua_max_pending_timers": {scope: HTTP_MAIN|STREAM_MAIN},
		"lua_max_running_timers": {scope: HTTP_MAIN|STREAM_MAIN},
		"lua_need_request_body": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"lua_package_cpath": {scope: HTTP_MAIN|STREAM_MAIN},
		"lua_package_path": {scope: HTTP_MAIN|STREAM_MAIN},
		"lua_regex_cache_max_entries": {scope: HTTP_MAIN|STREAM_MAIN},
		"lua_regex_match_limit": {scope: HTTP_MAIN|STREAM_MAIN},
		"lua_sa_restart": {scope: HTTP_MAIN|STREAM_MAIN},
		"lua_shared_dict": {scope: HTTP_MAIN|STREAM_MAIN},
		"lua_socket_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|STREAM_MAIN|STREAM_SRV},
		"lua_socket_connect_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|STREAM_MAIN|STREAM_SRV},
		"lua_socket_keepalive_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|STREAM_MAIN|STREAM_SRV},
		"lua_socket_log_errors": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|STREAM_MAIN|STREAM_SRV},
		"lua_socket_pool_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|STREAM_MAIN|STREAM_SRV},
		"lua_socket_read_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|STREAM_MAIN|STREAM_SRV},
		"lua_socket_send_lowat": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|STREAM_MAIN|STREAM_SRV},
		"lua_socket_send_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF|STREAM_MAIN|STREAM_SRV},
		"lua_ssl_ciphers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"lua_ssl_conf_command": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"lua_ssl_crl": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"lua_ssl_protocols": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"lua_ssl_trusted_certificate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"lua_ssl_verify_depth": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"lua_thread_cache_max_entries": {scope: HTTP_MAIN},
		"lua_transform_underscores_in_response_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"lua_use_default_type": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"mail": {scope: MAIN},
		"map": {scope: HTTP_MAIN|STREAM_MAIN},
		"map_hash_bucket_size": {scope: HTTP_MAIN|STREAM_MAIN},
		"map_hash_max_size": {scope: HTTP_MAIN|STREAM_MAIN},
		"master_process": {scope: MAIN},
		"match": {scope: HTTP_MAIN|STREAM_MAIN},
		"max_errors": {scope: MAIL_MAIN|MAIL_SRV},
		"max_ranges": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memc_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memc_cmds_allowed": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"memc_connect_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memc_flags_to_last_modified": {scope: HTTP_LOC|HTTP_LIF},
		"memc_ignore_client_abort": {scope: HTTP_LOC|HTTP_LIF},
		"memc_next_upstream": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memc_pass": {scope: HTTP_LOC|HTTP_LIF},
		"memc_read_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memc_send_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memc_upstream_fail_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memc_upstream_max_fails": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memcached_bind": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memcached_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memcached_connect_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memcached_force_ranges": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memcached_gzip_flag": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memcached_next_upstream": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memcached_next_upstream_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memcached_next_upstream_tries": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memcached_pass": {scope: HTTP_LOC|HTTP_LIF},
		"memcached_read_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memcached_send_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"memcached_socket_keepalive": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"merge_slashes": {scope: HTTP_MAIN|HTTP_SRV},
		"min_delete_depth": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"mirror": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"mirror_request_body": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"modern_browser": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"modern_browser_value": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"more_clear_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"more_clear_input_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"more_set_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"more_set_input_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"mp4": {scope: HTTP_LOC},
		"mp4_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"mp4_limit_rate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"mp4_limit_rate_after": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"mp4_max_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"msie_padding": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"msie_refresh": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"multi_accept": {scope: EVENT},
		"ntlm": {scope: HTTP_UPS},
		"open_file_cache": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"open_file_cache_errors": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"open_file_cache_events": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"open_file_cache_min_uses": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"open_file_cache_valid": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"open_log_file_cache": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"output_buffers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"override_charset": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"pcre_jit": {scope: MAIN},
		"perl": {scope: HTTP_LOC|HTTP_LMT},
		"perl_modules": {scope: HTTP_MAIN},
		"perl_require": {scope: HTTP_MAIN},
		"perl_set": {scope: HTTP_MAIN},
		"pid": {scope: MAIN},
		"pop3_auth": {scope: MAIL_MAIN|MAIL_SRV},
		"pop3_capabilities": {scope: MAIL_MAIN|MAIL_SRV},
		"port_in_redirect": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"post_acceptex": {scope: EVENT},
		"post_action": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"postpone_gzipping": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"postpone_output": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"preread_buffer_size": {scope: STREAM_MAIN|STREAM_SRV},
		"preread_by_lua_block": {scope: STREAM_MAIN|STREAM_SRV},
		"preread_by_lua_file": {scope: STREAM_MAIN|STREAM_SRV},
		"preread_by_lua_no_postpone": {scope: STREAM_MAIN},
		"preread_timeout": {scope: STREAM_MAIN|STREAM_SRV},
		"protocol": {scope: MAIL_SRV},
		"proxy": {scope: MAIL_MAIN|MAIL_SRV},
		"proxy_bind": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_buffer": {scope: MAIL_MAIN|MAIL_SRV},
		"proxy_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_buffering": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_buffers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_busy_buffers_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_background_update": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_bypass": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_convert_head": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_key": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_lock": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_lock_age": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_lock_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_max_range_offset": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_methods": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_min_uses": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_path": {scope: HTTP_MAIN},
		"proxy_cache_purge": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_revalidate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_use_stale": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cache_valid": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_connect_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_cookie_domain": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cookie_flags": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_cookie_path": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_download_rate": {scope: STREAM_MAIN|STREAM_SRV},
		"proxy_downstream_buffer": {scope: STREAM_MAIN|STREAM_SRV},
		"proxy_force_ranges": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_headers_hash_bucket_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_headers_hash_max_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_hide_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_http_version": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_ignore_client_abort": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_ignore_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_intercept_errors": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_limit_rate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_max_temp_file_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_method": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_next_upstream": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_next_upstream_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_next_upstream_tries": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_no_cache": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_pass": {scope: HTTP_LOC|HTTP_LIF|HTTP_LMT|STREAM_SRV},
		"proxy_pass_error_message": {scope: MAIL_MAIN|MAIL_SRV},
		"proxy_pass_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_pass_request_body": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_pass_request_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_protocol": {scope: STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"proxy_protocol_timeout": {scope: STREAM_MAIN|STREAM_SRV},
		"proxy_read_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_redirect": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_request_buffering": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_requests": {scope: STREAM_MAIN|STREAM_SRV},
		"proxy_responses": {scope: STREAM_MAIN|STREAM_SRV},
		"proxy_send_lowat": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_send_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_session_drop": {scope: STREAM_MAIN|STREAM_SRV},
		"proxy_set_body": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_set_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_smtp_auth": {scope: MAIL_MAIN|MAIL_SRV},
		"proxy_socket_keepalive": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl": {scope: STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_certificate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_certificate_key": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_ciphers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_conf_command": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_crl": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_name": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_password_file": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_protocols": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_server_name": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_session_reuse": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_trusted_certificate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_verify": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_ssl_verify_depth": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"proxy_store": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_store_access": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_temp_file_write_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_temp_path": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"proxy_timeout": {scope: STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"proxy_upload_rate": {scope: STREAM_MAIN|STREAM_SRV},
		"proxy_upstream_buffer": {scope: STREAM_MAIN|STREAM_SRV},
		"queue": {scope: HTTP_UPS},
		"random": {scope: HTTP_UPS|STREAM_UPS},
		"random_index": {scope: HTTP_LOC},
		"rds_csv": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_csv_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_csv_content_type": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_csv_field_name_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_csv_field_separator": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_csv_row_terminator": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_json": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_json_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_json_content_type": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_json_errcode_key": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_json_errstr_key": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_json_format": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_json_ret": {scope: HTTP_LOC|HTTP_LIF},
		"rds_json_root": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_json_success_property": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rds_json_user_property": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"read_ahead": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"real_ip_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"real_ip_recursive": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"recursive_error_pages": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"redis2_bind": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"redis2_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"redis2_connect_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"redis2_literal_raw_query": {scope: HTTP_LOC|HTTP_LIF},
		"redis2_next_upstream": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"redis2_pass": {scope: HTTP_LOC|HTTP_LIF},
		"redis2_query": {scope: HTTP_LOC|HTTP_LIF},
		"redis2_raw_queries": {scope: HTTP_LOC|HTTP_LIF},
		"redis2_raw_query": {scope: HTTP_LOC|HTTP_LIF},
		"redis2_read_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"redis2_send_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"referer_hash_bucket_size": {scope: HTTP_SRV|HTTP_LOC},
		"referer_hash_max_size": {scope: HTTP_SRV|HTTP_LOC},
		"replace_filter": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"replace_filter_last_modified": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"replace_filter_max_buffered_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"replace_filter_skip": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"replace_filter_types": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"request_pool_size": {scope: HTTP_MAIN|HTTP_SRV},
		"reset_timedout_connection": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"resolver": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"resolver_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"return": {scope: HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF|STREAM_SRV},
		"rewrite": {scope: HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"rewrite_by_lua": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rewrite_by_lua_block": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rewrite_by_lua_file": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"rewrite_by_lua_no_postpone": {scope: HTTP_MAIN},
		"rewrite_log": {scope: HTTP_MAIN|HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"root": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"satisfy": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_bind": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_buffering": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_buffers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_busy_buffers_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_background_update": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_bypass": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_key": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_lock": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_lock_age": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_lock_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_max_range_offset": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_methods": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_min_uses": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_path": {scope: HTTP_MAIN},
		"scgi_cache_purge": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_revalidate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_use_stale": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_cache_valid": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_connect_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_force_ranges": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_hide_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_ignore_client_abort": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_ignore_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_intercept_errors": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_limit_rate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_max_temp_file_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_next_upstream": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_next_upstream_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_next_upstream_tries": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_no_cache": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_param": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_pass": {scope: HTTP_LOC|HTTP_LIF},
		"scgi_pass_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_pass_request_body": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_pass_request_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_read_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_request_buffering": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_send_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_socket_keepalive": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_store": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_store_access": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_temp_file_write_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"scgi_temp_path": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"secure_link": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"secure_link_md5": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"secure_link_secret": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"send_lowat": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"send_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"sendfile": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"sendfile_max_chunk": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"server": {scope: HTTP_UPS|HTTP_MAIN|STREAM_MAIN|STREAM_UPS|MAIL_MAIN},
		"server_name": {scope: HTTP_SRV|MAIL_MAIN|MAIL_SRV},
		"server_name_in_redirect": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"server_names_hash_bucket_size": {scope: HTTP_MAIN},
		"server_names_hash_max_size": {scope: HTTP_MAIN},
		"server_tokens": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"session_log": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"session_log_format": {scope: HTTP_MAIN},
		"session_log_zone": {scope: HTTP_MAIN},
		"set": {scope: HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF|STREAM_SRV},
		"set_base32_alphabet": {scope: HTTP_MAIN|HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"set_base32_padding": {scope: HTTP_MAIN|HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"set_by_lua": {scope: HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"set_by_lua_block": {scope: HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"set_by_lua_file": {scope: HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"set_hashed_upstream": {scope: HTTP_MAIN|HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"set_real_ip_from": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"slice": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"smtp_auth": {scope: MAIL_MAIN|MAIL_SRV},
		"smtp_capabilities": {scope: MAIL_MAIN|MAIL_SRV},
		"smtp_client_buffer": {scope: MAIL_MAIN|MAIL_SRV},
		"smtp_greeting_delay": {scope: MAIL_MAIN|MAIL_SRV},
		"source_charset": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"spdy_chunk_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"spdy_headers_comp": {scope: HTTP_MAIN|HTTP_SRV},
		"split_clients": {scope: HTTP_MAIN|STREAM_MAIN},
		"srcache_buffer": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"srcache_default_expire": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"srcache_fetch": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"srcache_fetch_skip": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"srcache_header_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"srcache_ignore_content_encoding": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"srcache_max_expire": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"srcache_methods": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"srcache_request_cache_control": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"srcache_response_cache_control": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"srcache_store": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"srcache_store_hide_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"srcache_store_max_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"srcache_store_no_cache": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"srcache_store_no_store": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"srcache_store_pass_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"srcache_store_private": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"srcache_store_ranges": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"srcache_store_skip": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"srcache_store_statuses": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"ssi": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"ssi_ignore_recycled_buffers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"ssi_last_modified": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"ssi_min_file_chunk": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"ssi_silent_errors": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"ssi_types": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"ssi_value_length": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"ssl": {scope: HTTP_MAIN|HTTP_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_buffer_size": {scope: HTTP_MAIN|HTTP_SRV},
		"ssl_certificate": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_certificate_by_lua_block": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV},
		"ssl_certificate_by_lua_file": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV},
		"ssl_certificate_key": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_ciphers": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_client_certificate": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_conf_command": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_crl": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_dhparam": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_early_data": {scope: HTTP_MAIN|HTTP_SRV},
		"ssl_ecdh_curve": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_engine": {scope: MAIN},
		"ssl_handshake_timeout": {scope: STREAM_MAIN|STREAM_SRV},
		"ssl_ocsp": {scope: HTTP_MAIN|HTTP_SRV},
		"ssl_ocsp_cache": {scope: HTTP_MAIN|HTTP_SRV},
		"ssl_ocsp_responder": {scope: HTTP_MAIN|HTTP_SRV},
		"ssl_password_file": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_prefer_server_ciphers": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_preread": {scope: STREAM_MAIN|STREAM_SRV},
		"ssl_protocols": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_reject_handshake": {scope: HTTP_MAIN|HTTP_SRV},
		"ssl_session_cache": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_session_fetch_by_lua_block": {scope: HTTP_MAIN},
		"ssl_session_fetch_by_lua_file": {scope: HTTP_MAIN},
		"ssl_session_store_by_lua_block": {scope: HTTP_MAIN},
		"ssl_session_store_by_lua_file": {scope: HTTP_MAIN},
		"ssl_session_ticket_key": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_session_tickets": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_session_timeout": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_stapling": {scope: HTTP_MAIN|HTTP_SRV},
		"ssl_stapling_file": {scope: HTTP_MAIN|HTTP_SRV},
		"ssl_stapling_responder": {scope: HTTP_MAIN|HTTP_SRV},
		"ssl_stapling_verify": {scope: HTTP_MAIN|HTTP_SRV},
		"ssl_trusted_certificate": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_verify_client": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"ssl_verify_depth": {scope: HTTP_MAIN|HTTP_SRV|STREAM_MAIN|STREAM_SRV|MAIL_MAIN|MAIL_SRV},
		"starttls": {scope: MAIL_MAIN|MAIL_SRV},
		"state": {scope: HTTP_UPS|STREAM_UPS},
		"status": {scope: HTTP_LOC},
		"status_format": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"status_zone": {scope: HTTP_SRV|HTTP_LOC|HTTP_SIF|HTTP_LIF|HTTP_SRV|HTTP_LOC|HTTP_SIF|HTTP_LIF|HTTP_SRV},
		"sticky": {scope: HTTP_UPS},
		"sticky_cookie_insert": {scope: HTTP_UPS},
		"stream": {scope: MAIN},
		"stub_status": {scope: HTTP_SRV|HTTP_LOC},
		"sub_filter": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"sub_filter_last_modified": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"sub_filter_once": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"sub_filter_types": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"subrequest_output_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"tcp_nodelay": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|STREAM_MAIN|STREAM_SRV},
		"tcp_nopush": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"thread_pool": {scope: MAIN},
		"timeout": {scope: MAIL_MAIN|MAIL_SRV},
		"timer_resolution": {scope: MAIN},
		"try_files": {scope: HTTP_SRV|HTTP_LOC},
		"types": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"types_hash_bucket_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"types_hash_max_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"underscores_in_headers": {scope: HTTP_MAIN|HTTP_SRV},
		"uninitialized_variable_warn": {scope: HTTP_MAIN|HTTP_SRV|HTTP_SIF|HTTP_LOC|HTTP_LIF},
		"upstream": {scope: HTTP_MAIN|STREAM_MAIN},
		"upstream_conf": {scope: HTTP_LOC},
		"use": {scope: EVENT},
		"user": {scope: MAIN},
		"userid": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"userid_domain": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"userid_expires": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"userid_flags": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"userid_mark": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"userid_name": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"userid_p3p": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"userid_path": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"userid_service": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_bind": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_buffer_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_buffering": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_buffers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_busy_buffers_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_background_update": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_bypass": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_key": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_lock": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_lock_age": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_lock_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_max_range_offset": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_methods": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_min_uses": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_path": {scope: HTTP_MAIN},
		"uwsgi_cache_purge": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_revalidate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_use_stale": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_cache_valid": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_connect_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_force_ranges": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_hide_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ignore_client_abort": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ignore_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_intercept_errors": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_limit_rate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_max_temp_file_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_modifier1": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_modifier2": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_next_upstream": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_next_upstream_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_next_upstream_tries": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_no_cache": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_param": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_pass": {scope: HTTP_LOC|HTTP_LIF},
		"uwsgi_pass_header": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_pass_request_body": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_pass_request_headers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_read_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_request_buffering": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_send_timeout": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_socket_keepalive": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_certificate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_certificate_key": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_ciphers": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_conf_command": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_crl": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_name": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_password_file": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_protocols": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_server_name": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_session_reuse": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_trusted_certificate": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_verify": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_ssl_verify_depth": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_store": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_store_access": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_string": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_temp_file_write_size": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"uwsgi_temp_path": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"valid_referers": {scope: HTTP_SRV|HTTP_LOC},
		"variables_hash_bucket_size": {scope: HTTP_MAIN|STREAM_MAIN},
		"variables_hash_max_size": {scope: HTTP_MAIN|STREAM_MAIN},
		"worker_aio_requests": {scope: EVENT},
		"worker_connections": {scope: EVENT},
		"worker_cpu_affinity": {scope: MAIN},
		"worker_priority": {scope: MAIN},
		"worker_processes": {scope: MAIN},
		"worker_rlimit_core": {scope: MAIN},
		"worker_rlimit_nofile": {scope: MAIN},
		"worker_shutdown_timeout": {scope: MAIN},
		"working_directory": {scope: MAIN},
		"xclient": {scope: MAIL_MAIN|MAIL_SRV},
		"xml_entities": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"xslt_last_modified": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"xslt_param": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"xslt_string_param": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"xslt_stylesheet": {scope: HTTP_LOC},
		"xslt_types": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC},
		"xss_callback_arg": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"xss_get": {scope: HTTP_MAIN|HTTP_SRV|HTTP_LOC|HTTP_LIF},
		"zone": {scope: HTTP_UPS|STREAM_UPS},
		"zone_sync": {scope: STREAM_SRV},
		"zone_sync_buffers": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_connect_retry_interval": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_connect_timeout": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_interval": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_recv_buffer_size": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_server": {scope: STREAM_SRV},
		"zone_sync_ssl": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_ssl_certificate": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_ssl_certificate_key": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_ssl_ciphers": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_ssl_conf_command": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_ssl_crl": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_ssl_name": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_ssl_password_file": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_ssl_protocols": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_ssl_server_name": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_ssl_trusted_certificate": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_ssl_verify": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_ssl_verify_depth": {scope: STREAM_MAIN|STREAM_SRV},
		"zone_sync_timeout": {scope: STREAM_MAIN|STREAM_SRV},
	};

	var known_lua_ngx = [
		"AGAIN", "ALERT", "CRIT", "DEBUG", "DECLINED", "DONE", "EMERG", "ERR", "ERROR", "HTTP_ACCEPTED",
		"HTTP_BAD_GATEWAY", "HTTP_BAD_REQUEST", "HTTP_CLOSE", "HTTP_CONFLICT", "HTTP_CONTINUE",
		"HTTP_COPY", "HTTP_CREATED", "HTTP_DELETE", "HTTP_FORBIDDEN", "HTTP_GATEWAY_TIMEOUT", "HTTP_GET",
		"HTTP_GONE", "HTTP_HEAD", "HTTP_ILLEGAL", "HTTP_INSUFFICIENT_STORAGE",
		"HTTP_INTERNAL_SERVER_ERROR", "HTTP_LOCK", "HTTP_METHOD_NOT_IMPLEMENTED", "HTTP_MKCOL",
		"HTTP_MOVE", "HTTP_MOVED_PERMANENTLY", "HTTP_MOVED_TEMPORARILY", "HTTP_NOT_ACCEPTABLE",
		"HTTP_NOT_ALLOWED", "HTTP_NOT_FOUND", "HTTP_NOT_MODIFIED", "HTTP_NO_CONTENT", "HTTP_OK",
		"HTTP_OPTIONS", "HTTP_PARTIAL_CONTENT", "HTTP_PATCH", "HTTP_PAYMENT_REQUIRED",
		"HTTP_PERMANENT_REDIRECT", "HTTP_POST", "HTTP_PROPFIND", "HTTP_PROPPATCH", "HTTP_PUT",
		"HTTP_REQUEST_TIMEOUT", "HTTP_SEE_OTHER", "HTTP_SERVICE_UNAVAILABLE", "HTTP_SPECIAL_RESPONSE",
		"HTTP_SWITCHING_PROTOCOLS", "HTTP_TEMPORARY_REDIRECT", "HTTP_TOO_MANY_REQUESTS", "HTTP_TRACE",
		"HTTP_UNAUTHORIZED", "HTTP_UNLOCK", "HTTP_UPGRADE_REQUIRED", "HTTP_VERSION_NOT_SUPPORTED", "INFO",
		"NOTICE", "OK", "STDERR", "WARN", "arg", "balancer", "config.debug", "config.nginx_configure",
		"config.nginx_version", "config.ngx_lua_version", "config.prefix", "config.subsystem",
		"cookie_time", "crc32_long", "crc32_short", "ctx", "decode_args", "decode_base64", "encode_args",
		"encode_base64", "eof", "escape_uri", "exec", "exit", "flush", "get_phase", "headers_sent",
		"hmac_sha1", "http_time", "is_subrequest", "localtime", "location.capture",
		"location.capture_multi", "log", "md5", "md5_bin", "now", "ocsp", "on_abort", "parse_http_time",
		"print", "quote_sql_str", "re.find", "re.gmatch", "re.gsub", "re.match", "re.sub", "redirect",
		"req.append_body", "req.clear_header", "req.discard_body", "req.finish_body", "req.get_body_data",
		"req.get_body_file", "req.get_headers", "req.get_method", "req.get_post_args", "req.get_uri_args",
		"req.http_version", "req.init_body", "req.is_internal", "req.raw_header", "req.read_body",
		"req.set_body_data", "req.set_body_file", "req.set_header", "req.set_method", "req.set_uri",
		"req.set_uri_args", "req.socket", "req.start_time", "resp.get_headers", "say", "semaphore",
		"send_headers", "sha1_bin", "sleep", "socket.connect", "socket.stream", "socket.tcp", "socket.udp",
		"ssl", "status", "thread.kill", "thread.spawn", "thread.wait", "time", "timer.at", "timer.every",
		"timer.pending_count", "timer.running_count", "today", "unescape_uri", "update_time", "utctime",
		"worker.count", "worker.exiting", "worker.id", "worker.pid",
	];
	var known_lua = [
		'ngx\\.(?:' + known_lua_ngx.join('|') + ')',
		'ngx\\.(?:var|header|shared)(\\.\\w+)?',
		'ndk\\.set_var\\.\\w+',
		'coroutine\\.(?:create|resume|yield|wrap|running|status)',
	];

	// Constants:
	var ipaddr_mime    = 'text/x-ip-address';
	var lua_mime       = 'text/x-lua';
	var regex_mime     = 'text/x-regex';
	var variables_mime = 'text/x-variables';

	var regex_prefixes_cs = [ // cs = case-sensitive
		{prefix: '~', mime: regex_mime},
	];
	var regex_prefixes_ci = [ // ci = case-insensitive
		{prefix: '~*', mime: regex_mime},
		{prefix: '~',  mime: regex_mime},
	];

    // Default settings:
    var options = {
		initial_scope: 'main',
        check_directive_scope: true,
    };

    // Override default settings with user-provided settings:
	var user_options = typeof editor_options.mode === 'string' ? {} : editor_options.mode;
	for (option in options) {
		if (option in user_options) options[option] = user_options[option];
	}

	// Look for available modes that can be nested:
	var nested_modes = {
		[ipaddr_mime]: {
			// src/http/modules/ngx_http_geo_module.c says: geo range is AF_INET only
			options: { ipv6_ranges: false },
			instance: null,
		},
		[lua_mime]: {
			options: { specials: known_lua },
			instance: null,
		},
		[regex_mime]: {
			options: { extended: false }, // extended mode must be explicitly enabled through (?x)
			instance: null,
		},
		[variables_mime]: {
			options: {},
			instance: null,
		},
	};
	for (var mime in nested_modes) {
		var mode_for_mime = nested_modes[mime];
		mode_for_mime.options.name = mime;
		var cm_mode = CodeMirror.getMode({mode: mode_for_mime.options}, mode_for_mime.options);
		// CodeMirror is liable to return a mode named "null":
		if (cm_mode.name != 'null') mode_for_mime.instance = cm_mode;
	}
	function getMode(mime) {
		if (mime in nested_modes) {
			return nested_modes[mime].instance;
		}
		return false;
	}

	// Helper functions:
	function current(state) {
		if (!state.context.length) return false;
		return state.context[state.context.length - 1];
	}
	function current_block(state) {
		var i, rem;
		for (i = state.context.length - 1; i >= 0; -- i) {
			if (rem = state.context[i].match(/^block_(.+)/)) return rem[1];
		}
		return false;
	}
	function all_tokens(state, token) {
		var result = state.context.join(' ');
		if (token) result += ' ' + token;
		return result;
	}
	function push(state, new_context, new_context_state, token) {
		ret = all_tokens(state, token);
		state.context.push(new_context);
		state.context_state.push(new_context_state || {});
		return ret;
	}
	function pop(state, token) {
		// Initial contexts cannot be popped:
		if (current_context_state(state).initial) return all_tokens(state, token);

		var current_context = state.context.pop() || '';
		state.context_state.pop();
		if (token) current_context += ' ' + token;
		return all_tokens(state, current_context);
	}
	function current_context_state(state) {
		return state.context_state[state.context_state.length - 1];
	}
	function consume(stream, state, return_token) {
		stream.next();
		return token(state, return_token);
	}


	function expect(stream, state, expected_context, context_state) {
		push(state, expected_context, context_state);
		return tokenBase(stream, state);
	}
	function expect_single_variable(stream, state) {
		return expect(stream, state, 'single_variable', {});
	}
	function expect_raw_string(stream, state) {
		return expect(stream, state, 'string', {});
	}
	function expect_string_with_variables(stream, state) {
		return expect(stream, state, 'string', {mime: variables_mime});
	}
	function expect_ipaddr(stream, state) {
		return expect(stream, state, 'string', {mime: ipaddr_mime});
	}
	function expect_regex(stream, state) {
		return expect(stream, state, 'string', {mime: regex_mime});
	}
	function expect_string_or_regex(stream, state, allow_case_insensitive) {
		var prefixes = allow_case_insensitive ? regex_prefixes_ci : regex_prefixes_cs;
		return expect(stream, state, 'string', {mime_prefixes: prefixes});
	}
	function expect_string_with_variables_or_regex(stream, state, allow_case_insensitive) {
		var prefixes = allow_case_insensitive ? regex_prefixes_ci : regex_prefixes_cs;
		return expect(stream, state, 'string', {mime_prefixes: prefixes, mime: variables_mime});
	}

	// Consider the ')' characters in the following mod_rewrite "if" statement:
	//   if ($v ~ (foo|bar)) {}
	//                    ^^
	//                    AB
	// Parenthesis A is part of the string (here, a regex) whereas parenthesis B closes the condition.
	// Yet there is no separation whatsoever: no space, no quotes.
	// mod_rewrite receives a bunch of tokens from nginx's usual statements-and-token parsing.
	// Then it trims '(' and ')' from those tokens before parsing them. This non-linear parsing
	// becomes problematic for unquoted strings that contain ')': it becomes necessary to look
	// ahead to determine whether ')' closes the current "if" statement or whether it is part of
	// an unquoted string.
	function next_parenthesis_closes_if_statement(stream) {
		// Default assumption: ')' is part of an unquoted string
		var close_parenthesis = false;

		// Look for ') {' on the current line:
		if (stream.match(/^\)\s*\{/, false)) close_parenthesis = true;
		// Check whether ')' is the last non-space, non-comment character on the current line:
		else if (stream.match(/^\)\s*(#.*)?$/, false)) {
			// Look for the next non-space, non-comment character on up to 50 lines:
			for (var i = 1; i <= 50; ++ i) {
				var next_line = stream.lookAhead(i);
				if (typeof next_line === 'undefined') break; // no more lines
				next_line = next_line.trim();
				if (!next_line.length) continue; // empty line
				if (next_line[0] === '#') continue; // comment line
				// The next character is '{': ')' closes the current "if" statement:
				if (next_line[0] === '{') close_parenthesis = true;
				break;
			}
		}

		return close_parenthesis;
	}

	function error(stream) {
		stream.next();
		return 'error';
	}

	function handle_single_variable(stream, state) {
		if (stream.eatSpace()) return '';
		if (stream.match(/^\$\w+/)) return pop(state, 'variable-2');
		return error(stream);
	}

	function handle_string(stream, state) {
		var context_state = current_context_state(state);
		if (context_state.just_begun) context_state.just_begun = false;
		// If necessary, determine how the string will end:
		if (!context_state.expected_end) {
			if (stream.eat('"')) { // double-quote string:
				context_state.expected_end = /^"/;
				context_state.eat_start = true;
				context_state.eat_expected_end = true;
			}
			else if (stream.eat("'")) { // single-quoted string:
				context_state.expected_end = /^'/;
				context_state.eat_start = true;
				context_state.eat_expected_end = true;
			}
			else { // unquoted string/token:
				// tokens are separated with spaces or end of lines; semicolons
				// and opening braces end statements and thus also end tokens:
				context_state.expected_end =  /^(?:[\s;{]|$)/;
				context_state.eat_start = false;
				context_state.eat_expected_end = false;
				// unquoted string + mod_rewrite's "if" statement = troubles:
				if (context_state.rewrite_if) context_state.rewrite_if_unquoted = true;
				context_state.just_begun = true;
			}

			// Handle MIME prefixes:
			if (context_state.mime_prefixes) {
				for (var i = 0; i < context_state.mime_prefixes.length; ++ i) {
					var mime_prefix = context_state.mime_prefixes[i];
					if (stream.match(mime_prefix.prefix)) {
						context_state.mime = mime_prefix.mime;
						context_state.eat_start = true;
						break;
					}
				}
			}

			var mode, mime;
			if (mime = context_state.mime) {
				mode = context_state.mode = getMode(mime);
				// New string, new state:
				if (mode) state.modes[mime] = CodeMirror.startState(mode, mime);
			}

			if (context_state.eat_start) return 'string';
		}
		// Check whether we reached end of string:
		if (stream.match(context_state.expected_end, context_state.eat_expected_end)) {
			if (context_state.just_begun) return error(stream); // premature end of unquoted string
			return pop(state);
		}
		// unquoted string + mod_rewrite's "if" statement = troubles:
		if (context_state.rewrite_if_unquoted && stream.peek() === ')') {
			if (next_parenthesis_closes_if_statement(stream)) return pop(state);
		}
		// If requested and possible, delegate to another mode:
		if (context_state.mode) {
			var token = context_state.mode.token(stream, state.modes[context_state.mime]);
			return token;
		}
		// Otherwise, consume and mark as 'string':
		if (!stream.current()) {
			stream.match(/\\./); // backslash neutralises the next character
			stream.match('${'); // '{' ends strings but '${' does not
			if (!stream.current()) if (!stream.match(/\w+/)) stream.next();
		}
		return 'string';
	}

	function handle_generic_directive(stream, state) {
		if (stream.eatSpace()) return '';
		if (stream.match(';')) return pop(state, 'punctuation');
		if (stream.match('{')) return pop(state, 'bracket');
		return expect_string_with_variables(stream, state);
	}

	function handle_server_name(stream, state) {
		var context_state = current_context_state(state);
		if (!('names' in context_state)) context_state.names = 0;

		if (stream.eatSpace()) return '';
		if (stream.eat(';')) {
			return context_state.names ? pop(state, 'punctuation') : error(stream);
		}
		++ context_state.names;
		return expect_string_or_regex(stream, state, false);
	}

	function handle_location(stream, state) {
		var rem, context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.modifier) {
			context_state.mime = null;
			if (rem = stream.match(/^(=|~\*?|\^~)/)) {
				context_state.modifier = rem[1];
				if (rem[1][0] === '~') context_state.mime = regex_mime;
				return 'qualifier strong';
			} else {
				context_state.modifier = true;
				return tokenBase(stream, state);
			}
		} else if (!context_state.match) {
			context_state.match = true;
			return expect(stream, state, 'string', {mime: context_state.mime});
		} else if (stream.match('{')) return open_new_scope(state, 'location');

		return error(stream);
	}

	function handle_map(stream, state) {
		var context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.string) {
			context_state.string = true;
			return expect_string_with_variables(stream, state);
		} else if (!context_state.variable) {
			context_state.variable = true;
			return expect_single_variable(stream, state);
		} else if (stream.match('{')) return open_new_scope(state, 'map');
		return error(stream);
	}

	function handle_geo(stream, state) {
		var context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.address) {
			context_state.address = true;
			return expect_single_variable(stream, state);
		}
		if (!context_state.variable) {
			if (stream.match(/^\$\w+/)) {
				context_state.variable = true;
				return 'variable-2';
			}
		}
		if (stream.match('{')) return open_new_scope(state, 'geo');

		return error(stream);
	}

	function handle_block_map(stream, state, map_type) {
		var context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (context_state.expect_semicolon) {
			if (stream.match(';')) {
				context_state.expect_semicolon = false;
				return 'punctuation';
			}
			return error(stream);
		} else if (context_state.expect_raw_string) {
			context_state.expect_raw_string = false;
			context_state.expect_semicolon = true;
			return expect_raw_string(stream, state);
		} else if (context_state.expect_var_string) {
			context_state.expect_var_string = false;
			context_state.expect_semicolon = true;
			return expect_string_with_variables(stream, state);
		} else if (context_state.expect_ipaddr) {
			context_state.expect_ipaddr = false;
			context_state.expect_semicolon = true;
			return expect_ipaddr(stream, state);
		}

		if (map_type === 'map' && stream.match(/^(?:hostnames|volatile)/)) {
			context_state.expect_semicolon = true;
			return 'keyword';
		} else if (map_type === 'geo' && stream.match(/^(?:ranges|proxy_recursive)/)) {
			context_state.expect_semicolon = true;
			return 'keyword';
		} else if (map_type === 'geo' && stream.match(/^(?:delete|proxy)/)) {
			context_state.expect_ipaddr = true;
			return 'keyword';
		} else if (stream.match('include')) {
			context_state.expect_raw_string = true;
			return 'keyword';
		} else if (stream.match('default')) {
			context_state.expect_var_string = true;
			return 'keyword';
		} else if (stream.match('}')) {
			return pop(state, 'bracket');
		}

		push(state, map_type === 'geo' ? 'geo_parameter' : 'map_parameter', {});
		return tokenBase(stream, state);
	}

	function handle_map_parameter(stream, state) {
		var context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.source_value) {
			context_state.source_value = true;
			return expect_string_or_regex(stream, state, true);
		} else if (!context_state.resulting_value) {
			context_state.resulting_value = true;
			return expect_string_with_variables(stream, state);
		} else if (stream.match(';')) return pop(state, 'punctuation');

		return error(stream);
	}

	function handle_geo_parameter(stream, state) {
		var rem, context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.source_value) {
			context_state.source_value = true;
			return expect_ipaddr(stream, state);
		} else if (!context_state.resulting_value) {
			context_state.resulting_value = true;
			return expect_string_with_variables(stream, state);
		} else if (stream.match(';')) return pop(state, 'punctuation');

		return error(stream);
	}

	function handle_block_types(stream, state) {
		var context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (stream.match('}')) return pop(state, 'bracket');

		if (!context_state.mime_type) {
			// Quick'n dirty MIME type coloration; will not work between quotes:
			if (!context_state.ate_mime_registry && stream.match(/^(?:application|audio|font|example|image|message|model|multipart|text|video)\b/)) {
				context_state.ate_mime_registry = 1;
				return 'tag';
			}
			if (context_state.ate_mime_registry === 1 && stream.eat('/')) {
				context_state.ate_mime_registry = 2;
				return 'meta';
			}
			context_state.mime_type = true;
			context_state.extension = 0;
			return expect_raw_string(stream, state);
		}
		if (context_state.extension >= 1 && stream.eat(';')) {
			context_state.extension = -1;
			context_state.mime_type = false;
			delete context_state.ate_mime_registry;
			return 'punctuation';
		}
		if (context_state.extension >= 0) {
			++ context_state.extension;
			return expect_raw_string(stream, state);
		}

		return error(stream);
	}

	/**
	 * server is used to open server scopes but also to define server entries
	 * in upstream blocks, hence the need for a dedicated handler.
	 */
	function handle_server(stream, state) {
		var in_upstream = (current_scope_as_enum(state) & (HTTP_UPS|STREAM_UPS));
		// Extra effort to ensure we do not open a server {} scope inside an upstream {} scope:
		if (!in_upstream && current_block(state) === 'upstream') in_upstream = true;
		var handler = in_upstream ? handle_generic_directive : handle_simple_scope_opening;
		return handler(stream, state);
	}

	function handle_set(stream, state) {
		var context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.variable) {
			context_state.variable = true;
			return expect_single_variable(stream, state);
		} else if (!context_state.value) {
			context_state.value = true;
			return expect_string_with_variables(stream, state);
		} else if (stream.eat(';')) {
			return pop(state, 'punctuation');
		}
		return error(stream);
	}

	function handle_set_real_ip_from(stream, state) {
		var rem, context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.arg) {
			if (stream.match('unix:')) {
				context_state.arg = true;
				return 'tag';
			}
			if (stream.match(/^[0-9a-fA-F.:]+/, false)) {
				context_state.arg = true;
				return expect_ipaddr(stream, state);
			}
			context_state.arg = true;
			return expect_raw_string(stream, state);
		}
		if (stream.eat(';')) return pop(state, 'punctuation');

		return error(stream);
	}

	function handle_on_or_off(stream, state) {
		if (stream.eatSpace()) return '';
		if (stream.match('on') || stream.match('off')) return pop(state, 'tag');
		return error(stream);
	}

	function handle_proxy_cookie_flags(stream, state) {
		var context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (context_state.second_arg && stream.eat(';')) return pop(state, 'punctuation');
		if (!context_state.first_arg) {
			context_state.first_arg = true;
			if (stream.match('off')) {
				context_state.second_arg = true;
				return 'tag';
			}
			return expect_string_with_variables_or_regex(stream, state, false);
		} else {
			if (!context_state.second_arg) context_state.second_arg = true;
			if (stream.match(/(?:(?:no)?(?:secure|httponly)|nosamesite|samesite=(?:strict|lax|none))\b/)) {
				return 'tag';
			}
			return expect_string_with_variables(stream, state);
		}

		return error(stream);
	}

	function handle_proxy_cookie(stream, state) {
		var context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.first_arg) {
			context_state.first_arg = true;
			if (stream.match('off')) {
				context_state.second_arg = true;
				return 'tag';
			}
			var allow_case_insensitive = (context_state.keyword === 'proxy_cookie_path');
			return expect_string_with_variables_or_regex(stream, state, allow_case_insensitive);
		} else if (!context_state.second_arg) {
			context_state.second_arg = true;
			return expect_string_with_variables(stream, state);
		} else if (stream.match(';')) return pop(state, 'punctuation');

		return error(stream);
	}

	function handle_proxy_redirect(stream, state) {
		var context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.first_arg) {
			context_state.first_arg = true;
			if (stream.match('off') || stream.match('default')) {
				context_state.second_arg = true;
				return 'tag';
			}
			return expect_string_with_variables_or_regex(stream, state, true);
		} else if (!context_state.second_arg) {
			context_state.second_arg = true;
			return expect_string_with_variables(stream, state);
		} else if (stream.match(';')) return pop(state, 'punctuation');

		return error(stream);
	}

	function handle_return(stream, state) {
		// return code [text];
		// return code URL;
		// return URL;
		var rem, context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.status) {
			if (rem = stream.match(/^(\d\d\d)/)) {
				context_state.status = rem[1];
				return 'variable-2';
			}
			context_state.status = true;
			return tokenBase(stream, state);
		}
		if (stream.eat(';')) return pop(state, 'punctuation');
		if (!context_state.value) {
			context_state.value = true;
			return expect_string_with_variables(stream, state);
		}
		return error(stream);
	}


	function handle_rewrite(stream, state) {
		var rem, context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.regex) {
			context_state.regex = true;
			return expect_regex(stream, state);
		} else if (!context_state.replacement) {
			context_state.replacement = true;
			return expect_string_with_variables(stream, state);
		} else if (!context_state.flag) {
			if (rem = stream.match(/^(?:break|last|permanent|redirect)/)) {
				context_state.flag = rem[1];
				return 'keyword';
			}
		}
		if (stream.match(';')) return pop(state, 'punctuation');
		return error(stream);
	}

	function handle_if(stream, state) {
		var rem, context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.open_parenthesis) {
			if (stream.eat('(')) {
				context_state.open_parenthesis = true;
				return 'bracket';
			}
		} else if (!context_state.test_type) {
			if (rem = stream.match(/^\$(\w+)/)) {
				context_state.test_type = 'variable';
				context_state.variable = rem[1];
				return 'variable-2';
			} else if (rem = stream.match(/^(!?-[defx])/)) {
				context_state.test_type = 'filesystem';
				context_state.fstest = rem[1];
				context_state.mime = variables_mime;
				return 'qualifier strong';
			}
		} else if (context_state.variable && !context_state.operator) {
			if (stream.eat(')')) { // "if ($variable)" test
				context_state.operator = context_state.string = true;
				context_state.close_parenthesis = true;
				return 'bracket';
			}
			else if (rem = stream.match(/^(!?(~\*|~|=))/)) {
				context_state.operator = rem[1];
				context_state.mime = rem[2][0] === '~' ? regex_mime : variables_mime;
				return 'qualifier strong';
			}
		} else if (!context_state.string) {
			context_state.string = true;
			push(state, 'string', {mime: context_state.mime, rewrite_if: true});
			return tokenBase(stream, state);
		} else if (!context_state.close_parenthesis) {
			if (stream.eat(')')) {
				context_state.close_parenthesis = true;
				return 'bracket';
			}
		} else if (!context_state.open_bracket) {
			if (stream.eat('{')) return open_new_scope(state, 'if');
		}
		if (stream.eat('#')) { stream.skipToEnd(); return 'comment'; }
		return error(stream);
	}

	function handle_upstream(stream, state) {
		var rem, context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!context_state.name) {
			context_state.name = true;
			return expect_raw_string(stream, state);
		}
		if (stream.eat('{')) return open_new_scope(state, 'upstream');

		return error(stream);
	}

	function handle_limit_except(stream, state) {
		var rem, context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (!('methods' in context_state)) context_state.methods = 0;
		if (stream.match(/(?:GET|HEAD|POST|PUT|DELETE|MKCOL|COPY|MOVE|OPTIONS|PROPFIND|PROPPATCH|LOCK|UNLOCK|PATCH)/)) {
			++ context_state.methods;
			return 'tag';
		}
		if (stream.eat('{')) {
			return context_state.methods ? open_new_scope(state, 'limit_except') : error(stream);
		}

		return error(stream);
	}

	function handle_lua(stream, state) {
		var rem, context_state = current_context_state(state);
		var lua_mode = getMode(lua_mime);
		if (!('level' in context_state)) {
			context_state.level = 0;
			context_state.in_string = false;
			context_state.in_comment = false;
			if (lua_mode) state.modes[lua_mime] = CodeMirror.startState(lua_mode, lua_mime);
		}

		var next_char = stream.peek();
		if (lua_mode) {
			// Assume the nested lua mode will consume both strings and comments: focus only on braces:
			if (next_char === '}') {
				if (!context_state.level) {
					stream.eat('}');
					return pop(state, 'bracket');
				} else -- context_state.level;
			} else if (next_char === '{') ++ context_state.level;
			return lua_mode.token(stream, state.modes[lua_mime]);
		} else {
			// Without a nested mode, it is necessary to deal with braces but also with strings and comments:
			if (context_state.in_string) {
				if (stream.match(context_state.in_string)) context_state.in_string = false;
				else stream.skipTo(context_state.in_string);
				if (!stream.current()) stream.next();
				return 'string';
			} else if (context_state.in_comment) {
				if (stream.match(context_state.in_comment)) context_state.in_comment = false;
				else stream.skipTo(context_state.in_comment);
				if (!stream.current()) stream.next();
				return 'comment';
			} else {
				if (next_char === '}') {
					if (!context_state.level) {
						stream.eat('}');
						return pop(state, 'bracket');
					} else -- context_state.level;
				} else if (next_char === '{') ++ context_state.level;
				else if (next_char === '"' || next_char === "'") {
					context_state.in_string = next_char;
					stream.eat(next_char);
					return 'string';
				}
				if (rem = stream.match(/\[(=*)\[/)) {
					context_state.in_string = ']' + rem[1] + ']';
					return 'string';
				}
				if (stream.match('--[[')) { // Multi-line comments
					context_state.in_comment = ']]';
					return 'comment';
				}
				if (stream.match('--')) { // Single-line comments
					stream.skipToEnd();
					return 'comment';
				}
			}
			if (!stream.current() && !stream.match(/^(?:\\.|[^"'}{\\\[\]-]+)/)) stream.next();
			return '';
		}
	}

	function open_new_scope(state, scope_name) {
		pop(state);
		return push(state, 'block_' + scope_name, {}, 'bracket');
	}

	function handle_simple_scope_opening(stream, state) {
		var context_state = current_context_state(state);

		if (stream.eatSpace()) return '';
		if (stream.eat('{')) return open_new_scope(state, context_state.keyword);
		return error(stream);
	}

	function current_scope_as_string(state) {
		var rem, i, scopes = '';
		for (i = 0; i < state.context.length; ++ i) {
			rem = state.context[i].match(/^block_(.+)/);
			if (rem) {
				if (scopes.length) scopes += '/';
				scopes += rem[1];
			}
		}
		return scopes;
	}

	function current_scope_as_enum(state) {
		var scope_str = current_scope_as_string(state);
		return ANY|blocks_to_scope[scope_str];
	}

	var special_handlers = {
		/* Directives that open a new scope/block: */
		'events': handle_simple_scope_opening,
		'geo': handle_geo,
		'http': handle_simple_scope_opening,
		'if': handle_if,
		'limit_except': handle_limit_except,
		'location': handle_location,
		'mail': handle_simple_scope_opening,
		'map': handle_map,
		'server': handle_server,
		'server_name': handle_server_name,
		'stream': handle_simple_scope_opening,
		'types': handle_simple_scope_opening,
		'upstream': handle_upstream,
		'*_by_lua_block': handle_simple_scope_opening,

		/* Other directives: */
		'proxy_cookie_domain': handle_proxy_cookie,
		'proxy_cookie_flags': handle_proxy_cookie_flags,
		'proxy_cookie_path': handle_proxy_cookie,
		'proxy_redirect': handle_proxy_redirect,
		'real_ip_recursive': handle_on_or_off,
		'return': handle_return,
		'rewrite': handle_rewrite,
		'rewrite_log': handle_on_or_off,
		'set': handle_set,
		'set_real_ip_from': handle_set_real_ip_from,
		'uninitialized_variable_warn': handle_on_or_off,
	};

	function tokenBase(stream, state) {
		var rem, current_state = current(state);
		if (current_state === 'single_variable') return handle_single_variable(stream, state);
		if (current_state === 'string') return handle_string(stream, state);
		if (stream.eat('#')) {
			stream.skipToEnd();
			return 'comment';
		}
		if (current_state === 'map_parameter') return handle_map_parameter(stream, state);
		if (current_state === 'geo_parameter') return handle_geo_parameter(stream, state);
		if (current_state === 'block_map') return handle_block_map(stream, state, 'map');
		if (current_state === 'block_geo') return handle_block_map(stream, state, 'geo');
		if (current_state === 'block_types') return handle_block_types(stream, state);
		if (current_state === 'generic_directive') return handle_generic_directive(stream, state);
		if (current_state === 'block_lua') return handle_lua(stream, state);
		if (current_state in special_handlers) return special_handlers[current_state](stream, state);

		if (rem = stream.match(/[a-z0-9_]+/)) {
			var token = rem[0];
			var highlight = 'keyword';
			if (token in known_directives) {
				if (options.check_directive_scope) {
					var is_expected = (current_scope_as_enum(state) & known_directives[token].scope);
					if (!is_expected) highlight += ' error strong';
				}
				if (token.match(/_by_lua_block$/)) return push(state, '*_by_lua_block', {keyword: 'lua'}, highlight);
			}
			else highlight += ' em';
			var next_state = (token in special_handlers) ? token : 'generic_directive';
			return push(state, next_state, {keyword: token}, highlight);
		}
		if (stream.eat('}')) return pop(state, 'bracket');

		stream.next();
		return '';
	}

	function startState() {
		var new_state = {
			context: [],
			context_state: [],
			modes: {},
		};
		var i, initial_scopes = options.initial_scope.split('/');
		for (i = 0; i < initial_scopes.length; ++ i) {
			push(new_state, 'block_' + initial_scopes[i], {initial: true});
		}
		for (var mime in nested_modes) {
			var mode_for_mime = nested_modes[mime];
			if (mode_for_mime.instance) {
				new_state.modes[mime] = CodeMirror.startState(mode_for_mime.instance);
			}
		}
		return new_state;
	}
	function copyState(o) { // o = original
		var i, oo, oc, key, c = startState(); // c = copy, oo = original object, oc = object copy
		for (i = 0; i < o.context_state.length; ++i) {
			oo = o.context_state[i];
			oc = {};
			for (key in oo) oc[key] = (key === 'expected') ? oo[key].slice() : oo[key];
			c.context_state.push(oc);
		}
		c.context = o.context.slice();
		c.modes = {};
		for (var mime in o.modes) {
			c.modes[mime] = CodeMirror.copyState(nested_modes[mime].instance, o.modes[mime]);
		}
		return c;
	}
	return {
		startState: startState,
		copyState: copyState,
		token: tokenBase,
		data: {
			known_directives: known_directives
		},
	};
});

CodeMirror.defineMIME("text/x-nginx-conf", "nginx-renewed");
