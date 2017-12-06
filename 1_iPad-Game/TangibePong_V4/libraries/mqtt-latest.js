(function(f) {
	if (typeof exports === "object" && typeof module !== "undefined") {
		module.exports = f()
	} else if (typeof define === "function" && define.amd) {
		define([], f)
	} else {
		var g;
		if (typeof window !== "undefined") {
			g = window
		} else if (typeof global !== "undefined") {
			g = global
		} else if (typeof self !== "undefined") {
			g = self
		} else {
			g = this
		}
		g.mqtt = f()
	}
})(function() {
	var define, module, exports;
	return (function e(t, n, r) {
		function s(o, u) {
			if (!n[o]) {
				if (!t[o]) {
					var a = typeof require == "function" && require;
					if (!u && a) return a(o, !0);
					if (i) return i(o, !0);
					var f = new Error("Cannot find module '" + o + "'");
					throw f.code = "MODULE_NOT_FOUND", f
				}
				var l = n[o] = {
					exports: {}
				};
				t[o][0].call(l.exports, function(e) {
					var n = t[o][1][e];
					return s(n ? n : e)
				}, l, l.exports, e, t, n, r)
			}
			return n[o].exports
		}
		var i = typeof require == "function" && require;
		for (var o = 0; o < r.length; o++) s(r[o]);
		return s
	})({
		1: [function(require, module, exports) {
			(function(process, global) {
				"use strict";

				function defaultId() {
					return "mqttjs_" + Math.random().toString(16).substr(2, 8)
				}

				function sendPacket(t, e, i) {
					t.emit("packetsend", e), !mqttPacket.writeToStream(e, t.stream) && i ? t.stream.once("drain", i) : i && i()
				}

				function storeAndSend(t, e, i) {
					t.outgoingStore.put(e, function(n) {
						if (n) return i && i(n);
						sendPacket(t, e, i)
					})
				}

				function nop() {}

				function MqttClient(t, e) {
					var i, n = this;
					if (!(this instanceof MqttClient)) return new MqttClient(t, e);
					this.options = e || {};
					for (i in defaultConnectOptions) void 0 === this.options[i] ? this.options[i] = defaultConnectOptions[i] : this.options[i] = e[i];
					this.options.clientId = this.options.clientId || defaultId(), this.streamBuilder = t, this.outgoingStore = this.options.outgoingStore || new Store, this.incomingStore = this.options.incomingStore || new Store, this.queueQoSZero = void 0 === this.options.queueQoSZero || this.options.queueQoSZero, this._resubscribeTopics = {}, this.pingTimer = null, this.connected = !1, this.disconnecting = !1, this.queue = [], this.connackTimer = null, this.reconnectTimer = null, this.nextId = Math.floor(65535 * Math.random()), this.outgoing = {}, this.on("connect", function() {
						if (!this.disconnected) {
							this.connected = !0;
							var t = null;
							(t = this.outgoingStore.createStream()).once("readable", function() {
								function e() {
									var i, s = t.read(1);
									s && (!n.disconnecting && !n.reconnectTimer && n.options.reconnectPeriod > 0 ? (t.read(0), i = n.outgoing[s.messageId], n.outgoing[s.messageId] = function(t, n) {
										i && i(t, n), e()
									}, n._sendPacket(s)) : t.destroy && t.destroy())
								}
								e()
							}).on("error", this.emit.bind(this, "error"))
						}
					}), this.on("close", function() {
						this.connected = !1, clearTimeout(this.connackTimer)
					}), this.on("connect", this._setupPingTimer), this.on("connect", function() {
						function t() {
							var i = e.shift(),
								s = null;
							i && (s = i.packet, n._sendPacket(s, function(e) {
								i.cb && i.cb(e), t()
							}))
						}
						var e = this.queue;
						t()
					});
					var s = !0;
					this.on("connect", function() {
						!s && this.options.clean && Object.keys(this._resubscribeTopics).length > 0 && (this._resubscribeTopics.resubscribe = !0, this.subscribe(this._resubscribeTopics)), s = !1
					}), this.on("close", function() {
						null !== n.pingTimer && (n.pingTimer.clear(), n.pingTimer = null)
					}), this.on("close", this._setupReconnect), events.EventEmitter.call(this), this._setupStream()
				}
				var events = require("events"),
					Store = require("./store"),
					eos = require("end-of-stream"),
					mqttPacket = require("mqtt-packet"),
					Writable = require("readable-stream").Writable,
					inherits = require("inherits"),
					reInterval = require("reinterval"),
					validations = require("./validations"),
					setImmediate = global.setImmediate || function(t) {
						process.nextTick(t)
					},
					defaultConnectOptions = {
						keepalive: 60,
						reschedulePings: !0,
						protocolId: "MQTT",
						protocolVersion: 4,
						reconnectPeriod: 1e3,
						connectTimeout: 3e4,
						clean: !0
					};
				inherits(MqttClient, events.EventEmitter), MqttClient.prototype._setupStream = function() {
					function t() {
						var e = c.shift(),
							n = o;
						e ? i._handlePacket(e, t) : (o = null, n())
					}
					var e, i = this,
						n = new Writable,
						s = mqttPacket.parser(this.options),
						o = null,
						c = [];
					this._clearReconnect(), this.stream = this.streamBuilder(this), s.on("packet", function(t) {
						c.push(t)
					}), n._write = function(e, i, n) {
						o = n, s.parse(e), t()
					}, this.stream.pipe(n), this.stream.on("error", nop), eos(this.stream, this.emit.bind(this, "close")), (e = Object.create(this.options)).cmd = "connect", sendPacket(this, e), s.on("error", this.emit.bind(this, "error")), this.stream.setMaxListeners(1e3), clearTimeout(this.connackTimer), this.connackTimer = setTimeout(function() {
						i._cleanUp(!0)
					}, this.options.connectTimeout)
				}, MqttClient.prototype._handlePacket = function(t, e) {
					switch (this.emit("packetreceive", t), t.cmd) {
						case "publish":
							this._handlePublish(t, e);
							break;
						case "puback":
						case "pubrec":
						case "pubcomp":
						case "suback":
						case "unsuback":
							this._handleAck(t), e();
							break;
						case "pubrel":
							this._handlePubrel(t, e);
							break;
						case "connack":
							this._handleConnack(t), e();
							break;
						case "pingresp":
							this._handlePingresp(t), e()
					}
				}, MqttClient.prototype._checkDisconnecting = function(t) {
					return this.disconnecting && (t ? t(new Error("client disconnecting")) : this.emit("error", new Error("client disconnecting"))), this.disconnecting
				}, MqttClient.prototype.publish = function(t, e, i, n) {
					var s;
					if ("function" == typeof i && (n = i, i = null), i || (i = {
							qos: 0,
							retain: !1,
							dup: !1
						}), this._checkDisconnecting(n)) return this;
					switch (s = {
						cmd: "publish",
						topic: t,
						payload: e,
						qos: i.qos,
						retain: i.retain,
						messageId: this._nextId(),
						dup: i.dup
					}, i.qos) {
						case 1:
						case 2:
							this.outgoing[s.messageId] = n || nop, this._sendPacket(s);
							break;
						default:
							this._sendPacket(s, n)
					}
					return this
				}, MqttClient.prototype.subscribe = function() {
					var t, e, i = Array.prototype.slice.call(arguments),
						n = [],
						s = i.shift(),
						o = s.resubscribe,
						c = i.pop() || nop,
						r = i.pop(),
						a = this;
					return delete s.resubscribe, "string" == typeof s && (s = [s]), "function" != typeof c && (r = c, c = nop), null !== (e = validations.validateTopics(s)) ? (setImmediate(c, new Error("Invalid topic " + e)), this) : this._checkDisconnecting(c) ? this : (r || (r = {
						qos: 0
					}), Array.isArray(s) ? s.forEach(function(t) {
						(a._resubscribeTopics[t] < r.qos || !a._resubscribeTopics.hasOwnProperty(t) || o) && n.push({
							topic: t,
							qos: r.qos
						})
					}) : Object.keys(s).forEach(function(t) {
						(a._resubscribeTopics[t] < s[t] || !a._resubscribeTopics.hasOwnProperty(t) || o) && n.push({
							topic: t,
							qos: s[t]
						})
					}), t = {
						cmd: "subscribe",
						subscriptions: n,
						qos: 1,
						retain: !1,
						dup: !1,
						messageId: this._nextId()
					}, n.length ? (n.forEach(function(t) {
						a._resubscribeTopics[t.topic] = t.qos
					}), this.outgoing[t.messageId] = function(t, e) {
						if (!t)
							for (var i = e.granted, s = 0; s < i.length; s += 1) n[s].qos = i[s];
						c(t, n)
					}, this._sendPacket(t), this) : void c(null, []))
				}, MqttClient.prototype.unsubscribe = function(t, e) {
					var i = {
							cmd: "unsubscribe",
							qos: 1,
							messageId: this._nextId()
						},
						n = this;
					return e = e || nop, this._checkDisconnecting(e) ? this : ("string" == typeof t ? i.unsubscriptions = [t] : "object" == typeof t && t.length && (i.unsubscriptions = t), i.unsubscriptions.forEach(function(t) {
						delete n._resubscribeTopics[t]
					}), this.outgoing[i.messageId] = e, this._sendPacket(i), this)
				}, MqttClient.prototype.end = function(t, e) {
					function i() {
						s.disconnected = !0, s.incomingStore.close(function() {
							s.outgoingStore.close(e)
						})
					}

					function n() {
						s._cleanUp(t, setImmediate.bind(null, i))
					}
					var s = this;
					return "function" == typeof t && (e = t, t = !1), this.disconnecting ? this : (this._clearReconnect(), this.disconnecting = !0, !t && Object.keys(this.outgoing).length > 0 ? this.once("outgoingEmpty", setTimeout.bind(null, n, 10)) : n(), this)
				}, MqttClient.prototype._reconnect = function() {
					this.emit("reconnect"), this._setupStream()
				}, MqttClient.prototype._setupReconnect = function() {
					var t = this;
					!t.disconnecting && !t.reconnectTimer && t.options.reconnectPeriod > 0 && (this.reconnecting || (this.emit("offline"), this.reconnecting = !0), t.reconnectTimer = setInterval(function() {
						t._reconnect()
					}, t.options.reconnectPeriod))
				}, MqttClient.prototype._clearReconnect = function() {
					this.reconnectTimer && (clearInterval(this.reconnectTimer), this.reconnectTimer = null)
				}, MqttClient.prototype._cleanUp = function(t, e) {
					e && this.stream.on("close", e), t ? this.stream.destroy() : this._sendPacket({
						cmd: "disconnect"
					}, setImmediate.bind(null, this.stream.end.bind(this.stream))), this.disconnecting || (this._clearReconnect(), this._setupReconnect()), null !== this.pingTimer && (this.pingTimer.clear(), this.pingTimer = null)
				}, MqttClient.prototype._sendPacket = function(t, e) {
					if (this.connected)
						if (this._shiftPingInterval(), "publish" === t.cmd) switch (t.qos) {
							case 2:
							case 1:
								storeAndSend(this, t, e);
								break;
							case 0:
							default:
								sendPacket(this, t, e)
						} else sendPacket(this, t, e);
						else 0 === (t.qos || 0) && this.queueQoSZero || "publish" !== t.cmd ? this.queue.push({
							packet: t,
							cb: e
						}) : t.qos > 0 ? this.outgoingStore.put(t, function(t) {
							if (t) return e && e(t)
						}) : e && e(new Error("No connection to broker"))
				}, MqttClient.prototype._setupPingTimer = function() {
					var t = this;
					!this.pingTimer && this.options.keepalive && (this.pingResp = !0, this.pingTimer = reInterval(function() {
						t._checkPing()
					}, 1e3 * this.options.keepalive))
				}, MqttClient.prototype._shiftPingInterval = function() {
					this.pingTimer && this.options.keepalive && this.options.reschedulePings && this.pingTimer.reschedule(1e3 * this.options.keepalive)
				}, MqttClient.prototype._checkPing = function() {
					this.pingResp ? (this.pingResp = !1, this._sendPacket({
						cmd: "pingreq"
					})) : this._cleanUp(!0)
				}, MqttClient.prototype._handlePingresp = function() {
					this.pingResp = !0
				}, MqttClient.prototype._handleConnack = function(t) {
					var e = t.returnCode,
						i = ["", "Unacceptable protocol version", "Identifier rejected", "Server unavailable", "Bad username or password", "Not authorized"];
					if (clearTimeout(this.connackTimer), 0 === e) this.reconnecting = !1, this.emit("connect", t);
					else if (e > 0) {
						var n = new Error("Connection refused: " + i[e]);
						n.code = e, this.emit("error", n)
					}
				}, MqttClient.prototype._handlePublish = function(t, e) {
					var i = t.topic.toString(),
						n = t.payload,
						s = t.qos,
						o = t.messageId,
						c = this;
					switch (s) {
						case 2:
							this.incomingStore.put(t, function() {
								c._sendPacket({
									cmd: "pubrec",
									messageId: o
								}, e)
							});
							break;
						case 1:
							this._sendPacket({
								cmd: "puback",
								messageId: o
							});
						case 0:
							this.emit("message", i, n, t), this.handleMessage(t, e)
					}
				}, MqttClient.prototype.handleMessage = function(t, e) {
					e()
				}, MqttClient.prototype._handleAck = function(t) {
					var e = t.messageId,
						i = t.cmd,
						n = null,
						s = this.outgoing[e],
						o = this;
					if (s) {
						switch (i) {
							case "pubcomp":
							case "puback":
								delete this.outgoing[e], this.outgoingStore.del(t, s);
								break;
							case "pubrec":
								n = {
									cmd: "pubrel",
									qos: 2,
									messageId: e
								}, this._sendPacket(n);
								break;
							case "suback":
								delete this.outgoing[e], s(null, t);
								break;
							case "unsuback":
								delete this.outgoing[e], s(null);
								break;
							default:
								o.emit("error", new Error("unrecognized packet type"))
						}
						this.disconnecting && 0 === Object.keys(this.outgoing).length && this.emit("outgoingEmpty")
					}
				}, MqttClient.prototype._handlePubrel = function(t, e) {
					var i = t.messageId,
						n = this;
					n.incomingStore.get(t, function(s, o) {
						if (s) return n.emit("error", s);
						"pubrel" !== o.cmd && (n.emit("message", o.topic, o.payload, o), n.incomingStore.put(t)), n._sendPacket({
							cmd: "pubcomp",
							messageId: i
						}, e)
					})
				}, MqttClient.prototype._nextId = function() {
					var t = this.nextId++;
					return 65535 === t && (this.nextId = 1), t
				}, MqttClient.prototype.getLastMessageId = function() {
					return 1 === this.nextId ? 65535 : this.nextId - 1
				}, module.exports = MqttClient;

			}).call(this, require('_process'), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
		}, {
			"./store": 5,
			"./validations": 6,
			"_process": 31,
			"end-of-stream": 16,
			"events": 17,
			"inherits": 19,
			"mqtt-packet": 24,
			"readable-stream": 45,
			"reinterval": 46
		}],
		2: [function(require, module, exports) {
			"use strict";

			function buildBuilder(t, e) {
				var o, r;
				return e.port = e.port || 1883, e.hostname = e.hostname || e.host || "localhost", o = e.port, r = e.hostname, net.createConnection(o, r)
			}
			var net = require("net");
			module.exports = buildBuilder;

		}, {
			"net": 10
		}],
		3: [function(require, module, exports) {
			"use strict";

			function buildBuilder(r, e) {
				function t(t) {
					e.rejectUnauthorized && r.emit("error", t), o.end()
				}
				var o;
				return e.port = e.port || 8883, e.host = e.hostname || e.host || "localhost", e.rejectUnauthorized = !1 !== e.rejectUnauthorized, (o = tls.connect(e)).on("secureConnect", function() {
					e.rejectUnauthorized && !o.authorized ? o.emit("error", new Error("TLS not authorized")) : o.removeListener("error", t)
				}), o.on("error", t), o
			}
			var tls = require("tls");
			module.exports = buildBuilder;

		}, {
			"tls": 10
		}],
		4: [function(require, module, exports) {
			(function(process) {
				"use strict";

				function buildUrl(t, o) {
					var e = t.protocol + "://" + t.hostname + ":" + t.port + t.path;
					return "function" == typeof t.transformWsUrl && (e = t.transformWsUrl(e, t, o)), e
				}

				function setDefaultOpts(t) {
					t.hostname || (t.hostname = "localhost"), t.port || ("wss" === t.protocol ? t.port = 443 : t.port = 80), t.path || (t.path = "/"), t.wsOptions || (t.wsOptions = {}), IS_BROWSER || "wss" !== t.protocol || WSS_OPTIONS.forEach(function(o) {
						t.hasOwnProperty(o) && !t.wsOptions.hasOwnProperty(o) && (t.wsOptions[o] = t[o])
					})
				}

				function createWebSocket(t, o) {
					var e = "MQIsdp" === o.protocolId && 3 === o.protocolVersion ? "mqttv3.1" : "mqtt";
					setDefaultOpts(o);
					var r = buildUrl(o, t);
					return websocket(r, [e], o.wsOptions)
				}

				function buildBuilder(t, o) {
					return createWebSocket(t, o)
				}

				function buildBuilderBrowser(t, o) {
					if (o.hostname || (o.hostname = o.host), !o.hostname) {
						if ("undefined" == typeof document) throw new Error("Could not determine host. Specify host manually.");
						var e = urlModule.parse(document.URL);
						o.hostname = e.hostname, o.port || (o.port = e.port)
					}
					return createWebSocket(t, o)
				}
				var websocket = require("websocket-stream"),
					urlModule = require("url"),
					WSS_OPTIONS = ["rejectUnauthorized", "ca", "cert", "key", "pfx", "passphrase"],
					IS_BROWSER = "browser" === process.title;
				module.exports = IS_BROWSER ? buildBuilderBrowser : buildBuilder;

			}).call(this, require('_process'))
		}, {
			"_process": 31,
			"url": 50,
			"websocket-stream": 56
		}],
		5: [function(require, module, exports) {
			(function(process) {
				"use strict";

				function Store() {
					if (!(this instanceof Store)) return new Store;
					this._inflights = {}
				}
				var Readable = require("readable-stream").Readable,
					streamsOpts = {
						objectMode: !0
					};
				Store.prototype.put = function(t, e) {
					return this._inflights[t.messageId] = t, e && e(), this
				}, Store.prototype.createStream = function() {
					var t = new Readable(streamsOpts),
						e = this._inflights,
						s = Object.keys(this._inflights),
						i = !1,
						r = 0;
					return t._read = function() {
						!i && r < s.length ? this.push(e[s[r++]]) : this.push(null)
					}, t.destroy = function() {
						if (!i) {
							var t = this;
							i = !0, process.nextTick(function() {
								t.emit("close")
							})
						}
					}, t
				}, Store.prototype.del = function(t, e) {
					return (t = this._inflights[t.messageId]) ? (delete this._inflights[t.messageId], e(null, t)) : e && e(new Error("missing packet")), this
				}, Store.prototype.get = function(t, e) {
					return (t = this._inflights[t.messageId]) ? e(null, t) : e && e(new Error("missing packet")), this
				}, Store.prototype.close = function(t) {
					this._inflights = null, t && t()
				}, module.exports = Store;

			}).call(this, require('_process'))
		}, {
			"_process": 31,
			"readable-stream": 45
		}],
		6: [function(require, module, exports) {
			"use strict";

			function validateTopic(t) {
				for (var i = t.split("/"), e = 0; e < i.length; e++)
					if ("+" !== i[e]) {
						if ("#" === i[e]) return e === i.length - 1;
						if (-1 !== i[e].indexOf("+") || -1 !== i[e].indexOf("#")) return !1
					}
				return !0
			}

			function validateTopics(t) {
				if (0 === t.length) return "empty_topic_list";
				for (var i = 0; i < t.length; i++)
					if (!validateTopic(t[i])) return t[i];
				return null
			}
			module.exports = {
				validateTopics: validateTopics
			};

		}, {}],
		7: [function(require, module, exports) {
			(function(process) {
				"use strict";

				function parseAuthOptions(o) {
					var t;
					o.auth && ((t = o.auth.match(/^(.+):(.+)$/)) ? (o.username = t[1], o.password = t[2]) : o.username = o.auth)
				}

				function connect(o, t) {
					if ("object" != typeof o || t || (t = o, o = null), t = t || {}, o) {
						var r = url.parse(o, !0);
						if (null != r.port && (r.port = Number(r.port)), null === (t = xtend(r, t)).protocol) throw new Error("Missing protocol");
						t.protocol = t.protocol.replace(/:$/, "")
					}
					if (parseAuthOptions(t), t.query && "string" == typeof t.query.clientId && (t.clientId = t.query.clientId), t.cert && t.key) {
						if (!t.protocol) throw new Error("Missing secure protocol key");
						if (-1 === ["mqtts", "wss"].indexOf(t.protocol)) switch (t.protocol) {
							case "mqtt":
								t.protocol = "mqtts";
								break;
							case "ws":
								t.protocol = "wss";
								break;
							default:
								throw new Error('Unknown protocol for secure connection: "' + t.protocol + '"!')
						}
					}
					if (!protocols[t.protocol]) {
						var e = -1 !== ["mqtts", "wss"].indexOf(t.protocol);
						t.protocol = ["mqtt", "mqtts", "ws", "wss"].filter(function(o, t) {
							return (!e || t % 2 != 0) && "function" == typeof protocols[o]
						})[0]
					}
					if (!1 === t.clean && !t.clientId) throw new Error("Missing clientId for unclean clients");
					return new MqttClient(function(o) {
						return t.servers && (o._reconnectCount && o._reconnectCount !== t.servers.length || (o._reconnectCount = 0), t.host = t.servers[o._reconnectCount].host, t.port = t.servers[o._reconnectCount].port, t.hostname = t.host, o._reconnectCount++), protocols[t.protocol](o, t)
					}, t)
				}
				var MqttClient = require("../client"),
					url = require("url"),
					xtend = require("xtend"),
					protocols = {};
				"browser" !== process.title && (protocols.mqtt = require("./tcp"), protocols.tcp = require("./tcp"), protocols.ssl = require("./tls"), protocols.tls = require("./tls"), protocols.mqtts = require("./tls")), protocols.ws = require("./ws"), protocols.wss = require("./ws"), module.exports = connect, module.exports.connect = connect, module.exports.MqttClient = MqttClient;

			}).call(this, require('_process'))
		}, {
			"../client": 1,
			"./tcp": 2,
			"./tls": 3,
			"./ws": 4,
			"_process": 31,
			"url": 50,
			"xtend": 59
		}],
		8: [function(require, module, exports) {
			"use strict";

			function placeHoldersCount(o) {
				var r = o.length;
				if (r % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
				return "=" === o[r - 2] ? 2 : "=" === o[r - 1] ? 1 : 0
			}

			function byteLength(o) {
				return 3 * o.length / 4 - placeHoldersCount(o)
			}

			function toByteArray(o) {
				var r, e, t, u, n, p = o.length;
				u = placeHoldersCount(o), n = new Arr(3 * p / 4 - u), e = u > 0 ? p - 4 : p;
				var a = 0;
				for (r = 0; r < e; r += 4) t = revLookup[o.charCodeAt(r)] << 18 | revLookup[o.charCodeAt(r + 1)] << 12 | revLookup[o.charCodeAt(r + 2)] << 6 | revLookup[o.charCodeAt(r + 3)], n[a++] = t >> 16 & 255, n[a++] = t >> 8 & 255, n[a++] = 255 & t;
				return 2 === u ? (t = revLookup[o.charCodeAt(r)] << 2 | revLookup[o.charCodeAt(r + 1)] >> 4, n[a++] = 255 & t) : 1 === u && (t = revLookup[o.charCodeAt(r)] << 10 | revLookup[o.charCodeAt(r + 1)] << 4 | revLookup[o.charCodeAt(r + 2)] >> 2, n[a++] = t >> 8 & 255, n[a++] = 255 & t), n
			}

			function tripletToBase64(o) {
				return lookup[o >> 18 & 63] + lookup[o >> 12 & 63] + lookup[o >> 6 & 63] + lookup[63 & o]
			}

			function encodeChunk(o, r, e) {
				for (var t, u = [], n = r; n < e; n += 3) t = (o[n] << 16) + (o[n + 1] << 8) + o[n + 2], u.push(tripletToBase64(t));
				return u.join("")
			}

			function fromByteArray(o) {
				for (var r, e = o.length, t = e % 3, u = "", n = [], p = 0, a = e - t; p < a; p += 16383) n.push(encodeChunk(o, p, p + 16383 > a ? a : p + 16383));
				return 1 === t ? (r = o[e - 1], u += lookup[r >> 2], u += lookup[r << 4 & 63], u += "==") : 2 === t && (r = (o[e - 2] << 8) + o[e - 1], u += lookup[r >> 10], u += lookup[r >> 4 & 63], u += lookup[r << 2 & 63], u += "="), n.push(u), n.join("")
			}
			exports.byteLength = byteLength, exports.toByteArray = toByteArray, exports.fromByteArray = fromByteArray;
			for (var lookup = [], revLookup = [], Arr = "undefined" != typeof Uint8Array ? Uint8Array : Array, code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", i = 0, len = code.length; i < len; ++i) lookup[i] = code[i], revLookup[code.charCodeAt(i)] = i;
			revLookup["-".charCodeAt(0)] = 62, revLookup["_".charCodeAt(0)] = 63;

		}, {}],
		9: [function(require, module, exports) {
			(function(Buffer) {
				function BufferList(t) {
					if (!(this instanceof BufferList)) return new BufferList(t);
					if (this._bufs = [], this.length = 0, "function" == typeof t) {
						this._callback = t;
						var e = function(t) {
							this._callback && (this._callback(t), this._callback = null)
						}.bind(this);
						this.on("pipe", function(t) {
							t.on("error", e)
						}), this.on("unpipe", function(t) {
							t.removeListener("error", e)
						})
					} else this.append(t);
					DuplexStream.call(this)
				}
				var DuplexStream = require("readable-stream/duplex"),
					util = require("util");
				util.inherits(BufferList, DuplexStream), BufferList.prototype._offset = function(t) {
						var e, i = 0,
							s = 0;
						if (0 === t) return [0, 0];
						for (; s < this._bufs.length; s++) {
							if (e = i + this._bufs[s].length, t < e || s == this._bufs.length - 1) return [s, t - i];
							i = e
						}
					}, BufferList.prototype.append = function(t) {
						var e = 0;
						if (Buffer.isBuffer(t)) this._appendBuffer(t);
						else if (Array.isArray(t))
							for (; e < t.length; e++) this.append(t[e]);
						else if (t instanceof BufferList)
							for (; e < t._bufs.length; e++) this.append(t._bufs[e]);
						else null != t && ("number" == typeof t && (t = t.toString()), this._appendBuffer(new Buffer(t)));
						return this
					}, BufferList.prototype._appendBuffer = function(t) {
						this._bufs.push(t), this.length += t.length
					}, BufferList.prototype._write = function(t, e, i) {
						this._appendBuffer(t), "function" == typeof i && i()
					}, BufferList.prototype._read = function(t) {
						if (!this.length) return this.push(null);
						t = Math.min(t, this.length), this.push(this.slice(0, t)), this.consume(t)
					}, BufferList.prototype.end = function(t) {
						DuplexStream.prototype.end.call(this, t), this._callback && (this._callback(null, this.slice()), this._callback = null)
					}, BufferList.prototype.get = function(t) {
						return this.slice(t, t + 1)[0]
					}, BufferList.prototype.slice = function(t, e) {
						return "number" == typeof t && t < 0 && (t += this.length), "number" == typeof e && e < 0 && (e += this.length), this.copy(null, 0, t, e)
					}, BufferList.prototype.copy = function(t, e, i, s) {
						if (("number" != typeof i || i < 0) && (i = 0), ("number" != typeof s || s > this.length) && (s = this.length), i >= this.length) return t || new Buffer(0);
						if (s <= 0) return t || new Buffer(0);
						var f, n, r = !!t,
							u = this._offset(i),
							h = s - i,
							o = h,
							l = r && e || 0,
							p = u[1];
						if (0 === i && s == this.length) {
							if (!r) return 1 === this._bufs.length ? this._bufs[0] : Buffer.concat(this._bufs, this.length);
							for (n = 0; n < this._bufs.length; n++) this._bufs[n].copy(t, l), l += this._bufs[n].length;
							return t
						}
						if (o <= this._bufs[u[0]].length - p) return r ? this._bufs[u[0]].copy(t, e, p, p + o) : this._bufs[u[0]].slice(p, p + o);
						for (r || (t = new Buffer(h)), n = u[0]; n < this._bufs.length; n++) {
							if (f = this._bufs[n].length - p, !(o > f)) {
								this._bufs[n].copy(t, l, p, p + o);
								break
							}
							this._bufs[n].copy(t, l, p), l += f, o -= f, p && (p = 0)
						}
						return t
					}, BufferList.prototype.shallowSlice = function(t, e) {
						t = t || 0, e = e || this.length, t < 0 && (t += this.length), e < 0 && (e += this.length);
						var i = this._offset(t),
							s = this._offset(e),
							f = this._bufs.slice(i[0], s[0] + 1);
						return 0 == s[1] ? f.pop() : f[f.length - 1] = f[f.length - 1].slice(0, s[1]), 0 != i[1] && (f[0] = f[0].slice(i[1])), new BufferList(f)
					}, BufferList.prototype.toString = function(t, e, i) {
						return this.slice(e, i).toString(t)
					}, BufferList.prototype.consume = function(t) {
						for (; this._bufs.length;) {
							if (!(t >= this._bufs[0].length)) {
								this._bufs[0] = this._bufs[0].slice(t), this.length -= t;
								break
							}
							t -= this._bufs[0].length, this.length -= this._bufs[0].length, this._bufs.shift()
						}
						return this
					}, BufferList.prototype.duplicate = function() {
						for (var t = 0, e = new BufferList; t < this._bufs.length; t++) e.append(this._bufs[t]);
						return e
					}, BufferList.prototype.destroy = function() {
						this._bufs.length = 0, this.length = 0, this.push(null)
					},
					function() {
						var t = {
							readDoubleBE: 8,
							readDoubleLE: 8,
							readFloatBE: 4,
							readFloatLE: 4,
							readInt32BE: 4,
							readInt32LE: 4,
							readUInt32BE: 4,
							readUInt32LE: 4,
							readInt16BE: 2,
							readInt16LE: 2,
							readUInt16BE: 2,
							readUInt16LE: 2,
							readInt8: 1,
							readUInt8: 1
						};
						for (var e in t) ! function(e) {
							BufferList.prototype[e] = function(i) {
								return this.slice(i, i + t[e])[e](0)
							}
						}(e)
					}(), module.exports = BufferList;

			}).call(this, require("buffer").Buffer)
		}, {
			"buffer": 11,
			"readable-stream/duplex": 36,
			"util": 55
		}],
		10: [function(require, module, exports) {

		}, {}],
		11: [function(require, module, exports) {
			"use strict";

			function typedArraySupport() {
				try {
					var e = new Uint8Array(1);
					return e.__proto__ = {
						__proto__: Uint8Array.prototype,
						foo: function() {
							return 42
						}
					}, 42 === e.foo()
				} catch (e) {
					return !1
				}
			}

			function createBuffer(e) {
				if (e > K_MAX_LENGTH) throw new RangeError("Invalid typed array length");
				var t = new Uint8Array(e);
				return t.__proto__ = Buffer.prototype, t
			}

			function Buffer(e, t, r) {
				if ("number" == typeof e) {
					if ("string" == typeof t) throw new Error("If encoding is specified then the first argument must be a string");
					return allocUnsafe(e)
				}
				return from(e, t, r)
			}

			function from(e, t, r) {
				if ("number" == typeof e) throw new TypeError('"value" argument must not be a number');
				return e instanceof ArrayBuffer ? fromArrayBuffer(e, t, r) : "string" == typeof e ? fromString(e, t) : fromObject(e)
			}

			function assertSize(e) {
				if ("number" != typeof e) throw new TypeError('"size" argument must be a number');
				if (e < 0) throw new RangeError('"size" argument must not be negative')
			}

			function alloc(e, t, r) {
				return assertSize(e), e <= 0 ? createBuffer(e) : void 0 !== t ? "string" == typeof r ? createBuffer(e).fill(t, r) : createBuffer(e).fill(t) : createBuffer(e)
			}

			function allocUnsafe(e) {
				return assertSize(e), createBuffer(e < 0 ? 0 : 0 | checked(e))
			}

			function fromString(e, t) {
				if ("string" == typeof t && "" !== t || (t = "utf8"), !Buffer.isEncoding(t)) throw new TypeError('"encoding" must be a valid string encoding');
				var r = 0 | byteLength(e, t),
					n = createBuffer(r),
					f = n.write(e, t);
				return f !== r && (n = n.slice(0, f)), n
			}

			function fromArrayLike(e) {
				for (var t = e.length < 0 ? 0 : 0 | checked(e.length), r = createBuffer(t), n = 0; n < t; n += 1) r[n] = 255 & e[n];
				return r
			}

			function fromArrayBuffer(e, t, r) {
				if (t < 0 || e.byteLength < t) throw new RangeError("'offset' is out of bounds");
				if (e.byteLength < t + (r || 0)) throw new RangeError("'length' is out of bounds");
				var n;
				return n = void 0 === t && void 0 === r ? new Uint8Array(e) : void 0 === r ? new Uint8Array(e, t) : new Uint8Array(e, t, r), n.__proto__ = Buffer.prototype, n
			}

			function fromObject(e) {
				if (Buffer.isBuffer(e)) {
					var t = 0 | checked(e.length),
						r = createBuffer(t);
					return 0 === r.length ? r : (e.copy(r, 0, 0, t), r)
				}
				if (e) {
					if (isArrayBufferView(e) || "length" in e) return "number" != typeof e.length || numberIsNaN(e.length) ? createBuffer(0) : fromArrayLike(e);
					if ("Buffer" === e.type && Array.isArray(e.data)) return fromArrayLike(e.data)
				}
				throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")
			}

			function checked(e) {
				if (e >= K_MAX_LENGTH) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
				return 0 | e
			}

			function SlowBuffer(e) {
				return +e != e && (e = 0), Buffer.alloc(+e)
			}

			function byteLength(e, t) {
				if (Buffer.isBuffer(e)) return e.length;
				if (isArrayBufferView(e) || e instanceof ArrayBuffer) return e.byteLength;
				"string" != typeof e && (e = "" + e);
				var r = e.length;
				if (0 === r) return 0;
				for (var n = !1;;) switch (t) {
					case "ascii":
					case "latin1":
					case "binary":
						return r;
					case "utf8":
					case "utf-8":
					case void 0:
						return utf8ToBytes(e).length;
					case "ucs2":
					case "ucs-2":
					case "utf16le":
					case "utf-16le":
						return 2 * r;
					case "hex":
						return r >>> 1;
					case "base64":
						return base64ToBytes(e).length;
					default:
						if (n) return utf8ToBytes(e).length;
						t = ("" + t).toLowerCase(), n = !0
				}
			}

			function slowToString(e, t, r) {
				var n = !1;
				if ((void 0 === t || t < 0) && (t = 0), t > this.length) return "";
				if ((void 0 === r || r > this.length) && (r = this.length), r <= 0) return "";
				if (r >>>= 0, t >>>= 0, r <= t) return "";
				for (e || (e = "utf8");;) switch (e) {
					case "hex":
						return hexSlice(this, t, r);
					case "utf8":
					case "utf-8":
						return utf8Slice(this, t, r);
					case "ascii":
						return asciiSlice(this, t, r);
					case "latin1":
					case "binary":
						return latin1Slice(this, t, r);
					case "base64":
						return base64Slice(this, t, r);
					case "ucs2":
					case "ucs-2":
					case "utf16le":
					case "utf-16le":
						return utf16leSlice(this, t, r);
					default:
						if (n) throw new TypeError("Unknown encoding: " + e);
						e = (e + "").toLowerCase(), n = !0
				}
			}

			function swap(e, t, r) {
				var n = e[t];
				e[t] = e[r], e[r] = n
			}

			function bidirectionalIndexOf(e, t, r, n, f) {
				if (0 === e.length) return -1;
				if ("string" == typeof r ? (n = r, r = 0) : r > 2147483647 ? r = 2147483647 : r < -2147483648 && (r = -2147483648), r = +r, numberIsNaN(r) && (r = f ? 0 : e.length - 1), r < 0 && (r = e.length + r), r >= e.length) {
					if (f) return -1;
					r = e.length - 1
				} else if (r < 0) {
					if (!f) return -1;
					r = 0
				}
				if ("string" == typeof t && (t = Buffer.from(t, n)), Buffer.isBuffer(t)) return 0 === t.length ? -1 : arrayIndexOf(e, t, r, n, f);
				if ("number" == typeof t) return t &= 255, "function" == typeof Uint8Array.prototype.indexOf ? f ? Uint8Array.prototype.indexOf.call(e, t, r) : Uint8Array.prototype.lastIndexOf.call(e, t, r) : arrayIndexOf(e, [t], r, n, f);
				throw new TypeError("val must be string, number or Buffer")
			}

			function arrayIndexOf(e, t, r, n, f) {
				function i(e, t) {
					return 1 === o ? e[t] : e.readUInt16BE(t * o)
				}
				var o = 1,
					u = e.length,
					s = t.length;
				if (void 0 !== n && ("ucs2" === (n = String(n).toLowerCase()) || "ucs-2" === n || "utf16le" === n || "utf-16le" === n)) {
					if (e.length < 2 || t.length < 2) return -1;
					o = 2, u /= 2, s /= 2, r /= 2
				}
				var a;
				if (f) {
					var h = -1;
					for (a = r; a < u; a++)
						if (i(e, a) === i(t, -1 === h ? 0 : a - h)) {
							if (-1 === h && (h = a), a - h + 1 === s) return h * o
						} else -1 !== h && (a -= a - h), h = -1
				} else
					for (r + s > u && (r = u - s), a = r; a >= 0; a--) {
						for (var c = !0, l = 0; l < s; l++)
							if (i(e, a + l) !== i(t, l)) {
								c = !1;
								break
							}
						if (c) return a
					}
				return -1
			}

			function hexWrite(e, t, r, n) {
				r = Number(r) || 0;
				var f = e.length - r;
				n ? (n = Number(n)) > f && (n = f) : n = f;
				var i = t.length;
				if (i % 2 != 0) throw new TypeError("Invalid hex string");
				n > i / 2 && (n = i / 2);
				for (var o = 0; o < n; ++o) {
					var u = parseInt(t.substr(2 * o, 2), 16);
					if (numberIsNaN(u)) return o;
					e[r + o] = u
				}
				return o
			}

			function utf8Write(e, t, r, n) {
				return blitBuffer(utf8ToBytes(t, e.length - r), e, r, n)
			}

			function asciiWrite(e, t, r, n) {
				return blitBuffer(asciiToBytes(t), e, r, n)
			}

			function latin1Write(e, t, r, n) {
				return asciiWrite(e, t, r, n)
			}

			function base64Write(e, t, r, n) {
				return blitBuffer(base64ToBytes(t), e, r, n)
			}

			function ucs2Write(e, t, r, n) {
				return blitBuffer(utf16leToBytes(t, e.length - r), e, r, n)
			}

			function base64Slice(e, t, r) {
				return 0 === t && r === e.length ? base64.fromByteArray(e) : base64.fromByteArray(e.slice(t, r))
			}

			function utf8Slice(e, t, r) {
				r = Math.min(e.length, r);
				for (var n = [], f = t; f < r;) {
					var i = e[f],
						o = null,
						u = i > 239 ? 4 : i > 223 ? 3 : i > 191 ? 2 : 1;
					if (f + u <= r) {
						var s, a, h, c;
						switch (u) {
							case 1:
								i < 128 && (o = i);
								break;
							case 2:
								128 == (192 & (s = e[f + 1])) && (c = (31 & i) << 6 | 63 & s) > 127 && (o = c);
								break;
							case 3:
								s = e[f + 1], a = e[f + 2], 128 == (192 & s) && 128 == (192 & a) && (c = (15 & i) << 12 | (63 & s) << 6 | 63 & a) > 2047 && (c < 55296 || c > 57343) && (o = c);
								break;
							case 4:
								s = e[f + 1], a = e[f + 2], h = e[f + 3], 128 == (192 & s) && 128 == (192 & a) && 128 == (192 & h) && (c = (15 & i) << 18 | (63 & s) << 12 | (63 & a) << 6 | 63 & h) > 65535 && c < 1114112 && (o = c)
						}
					}
					null === o ? (o = 65533, u = 1) : o > 65535 && (o -= 65536, n.push(o >>> 10 & 1023 | 55296), o = 56320 | 1023 & o), n.push(o), f += u
				}
				return decodeCodePointsArray(n)
			}

			function decodeCodePointsArray(e) {
				var t = e.length;
				if (t <= MAX_ARGUMENTS_LENGTH) return String.fromCharCode.apply(String, e);
				for (var r = "", n = 0; n < t;) r += String.fromCharCode.apply(String, e.slice(n, n += MAX_ARGUMENTS_LENGTH));
				return r
			}

			function asciiSlice(e, t, r) {
				var n = "";
				r = Math.min(e.length, r);
				for (var f = t; f < r; ++f) n += String.fromCharCode(127 & e[f]);
				return n
			}

			function latin1Slice(e, t, r) {
				var n = "";
				r = Math.min(e.length, r);
				for (var f = t; f < r; ++f) n += String.fromCharCode(e[f]);
				return n
			}

			function hexSlice(e, t, r) {
				var n = e.length;
				(!t || t < 0) && (t = 0), (!r || r < 0 || r > n) && (r = n);
				for (var f = "", i = t; i < r; ++i) f += toHex(e[i]);
				return f
			}

			function utf16leSlice(e, t, r) {
				for (var n = e.slice(t, r), f = "", i = 0; i < n.length; i += 2) f += String.fromCharCode(n[i] + 256 * n[i + 1]);
				return f
			}

			function checkOffset(e, t, r) {
				if (e % 1 != 0 || e < 0) throw new RangeError("offset is not uint");
				if (e + t > r) throw new RangeError("Trying to access beyond buffer length")
			}

			function checkInt(e, t, r, n, f, i) {
				if (!Buffer.isBuffer(e)) throw new TypeError('"buffer" argument must be a Buffer instance');
				if (t > f || t < i) throw new RangeError('"value" argument is out of bounds');
				if (r + n > e.length) throw new RangeError("Index out of range")
			}

			function checkIEEE754(e, t, r, n, f, i) {
				if (r + n > e.length) throw new RangeError("Index out of range");
				if (r < 0) throw new RangeError("Index out of range")
			}

			function writeFloat(e, t, r, n, f) {
				return t = +t, r >>>= 0, f || checkIEEE754(e, t, r, 4, 3.4028234663852886e38, -3.4028234663852886e38), ieee754.write(e, t, r, n, 23, 4), r + 4
			}

			function writeDouble(e, t, r, n, f) {
				return t = +t, r >>>= 0, f || checkIEEE754(e, t, r, 8, 1.7976931348623157e308, -1.7976931348623157e308), ieee754.write(e, t, r, n, 52, 8), r + 8
			}

			function base64clean(e) {
				if ((e = e.trim().replace(INVALID_BASE64_RE, "")).length < 2) return "";
				for (; e.length % 4 != 0;) e += "=";
				return e
			}

			function toHex(e) {
				return e < 16 ? "0" + e.toString(16) : e.toString(16)
			}

			function utf8ToBytes(e, t) {
				t = t || 1 / 0;
				for (var r, n = e.length, f = null, i = [], o = 0; o < n; ++o) {
					if ((r = e.charCodeAt(o)) > 55295 && r < 57344) {
						if (!f) {
							if (r > 56319) {
								(t -= 3) > -1 && i.push(239, 191, 189);
								continue
							}
							if (o + 1 === n) {
								(t -= 3) > -1 && i.push(239, 191, 189);
								continue
							}
							f = r;
							continue
						}
						if (r < 56320) {
							(t -= 3) > -1 && i.push(239, 191, 189), f = r;
							continue
						}
						r = 65536 + (f - 55296 << 10 | r - 56320)
					} else f && (t -= 3) > -1 && i.push(239, 191, 189);
					if (f = null, r < 128) {
						if ((t -= 1) < 0) break;
						i.push(r)
					} else if (r < 2048) {
						if ((t -= 2) < 0) break;
						i.push(r >> 6 | 192, 63 & r | 128)
					} else if (r < 65536) {
						if ((t -= 3) < 0) break;
						i.push(r >> 12 | 224, r >> 6 & 63 | 128, 63 & r | 128)
					} else {
						if (!(r < 1114112)) throw new Error("Invalid code point");
						if ((t -= 4) < 0) break;
						i.push(r >> 18 | 240, r >> 12 & 63 | 128, r >> 6 & 63 | 128, 63 & r | 128)
					}
				}
				return i
			}

			function asciiToBytes(e) {
				for (var t = [], r = 0; r < e.length; ++r) t.push(255 & e.charCodeAt(r));
				return t
			}

			function utf16leToBytes(e, t) {
				for (var r, n, f, i = [], o = 0; o < e.length && !((t -= 2) < 0); ++o) n = (r = e.charCodeAt(o)) >> 8, f = r % 256, i.push(f), i.push(n);
				return i
			}

			function base64ToBytes(e) {
				return base64.toByteArray(base64clean(e))
			}

			function blitBuffer(e, t, r, n) {
				for (var f = 0; f < n && !(f + r >= t.length || f >= e.length); ++f) t[f + r] = e[f];
				return f
			}

			function isArrayBufferView(e) {
				return "function" == typeof ArrayBuffer.isView && ArrayBuffer.isView(e)
			}

			function numberIsNaN(e) {
				return e !== e
			}
			var base64 = require("base64-js"),
				ieee754 = require("ieee754");
			exports.Buffer = Buffer, exports.SlowBuffer = SlowBuffer, exports.INSPECT_MAX_BYTES = 50;
			var K_MAX_LENGTH = 2147483647;
			exports.kMaxLength = K_MAX_LENGTH, Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport(), Buffer.TYPED_ARRAY_SUPPORT || "undefined" == typeof console || "function" != typeof console.error || console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."), "undefined" != typeof Symbol && Symbol.species && Buffer[Symbol.species] === Buffer && Object.defineProperty(Buffer, Symbol.species, {
				value: null,
				configurable: !0,
				enumerable: !1,
				writable: !1
			}), Buffer.poolSize = 8192, Buffer.from = function(e, t, r) {
				return from(e, t, r)
			}, Buffer.prototype.__proto__ = Uint8Array.prototype, Buffer.__proto__ = Uint8Array, Buffer.alloc = function(e, t, r) {
				return alloc(e, t, r)
			}, Buffer.allocUnsafe = function(e) {
				return allocUnsafe(e)
			}, Buffer.allocUnsafeSlow = function(e) {
				return allocUnsafe(e)
			}, Buffer.isBuffer = function(e) {
				return null != e && !0 === e._isBuffer
			}, Buffer.compare = function(e, t) {
				if (!Buffer.isBuffer(e) || !Buffer.isBuffer(t)) throw new TypeError("Arguments must be Buffers");
				if (e === t) return 0;
				for (var r = e.length, n = t.length, f = 0, i = Math.min(r, n); f < i; ++f)
					if (e[f] !== t[f]) {
						r = e[f], n = t[f];
						break
					}
				return r < n ? -1 : n < r ? 1 : 0
			}, Buffer.isEncoding = function(e) {
				switch (String(e).toLowerCase()) {
					case "hex":
					case "utf8":
					case "utf-8":
					case "ascii":
					case "latin1":
					case "binary":
					case "base64":
					case "ucs2":
					case "ucs-2":
					case "utf16le":
					case "utf-16le":
						return !0;
					default:
						return !1
				}
			}, Buffer.concat = function(e, t) {
				if (!Array.isArray(e)) throw new TypeError('"list" argument must be an Array of Buffers');
				if (0 === e.length) return Buffer.alloc(0);
				var r;
				if (void 0 === t)
					for (t = 0, r = 0; r < e.length; ++r) t += e[r].length;
				var n = Buffer.allocUnsafe(t),
					f = 0;
				for (r = 0; r < e.length; ++r) {
					var i = e[r];
					if (!Buffer.isBuffer(i)) throw new TypeError('"list" argument must be an Array of Buffers');
					i.copy(n, f), f += i.length
				}
				return n
			}, Buffer.byteLength = byteLength, Buffer.prototype._isBuffer = !0, Buffer.prototype.swap16 = function() {
				var e = this.length;
				if (e % 2 != 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
				for (var t = 0; t < e; t += 2) swap(this, t, t + 1);
				return this
			}, Buffer.prototype.swap32 = function() {
				var e = this.length;
				if (e % 4 != 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
				for (var t = 0; t < e; t += 4) swap(this, t, t + 3), swap(this, t + 1, t + 2);
				return this
			}, Buffer.prototype.swap64 = function() {
				var e = this.length;
				if (e % 8 != 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
				for (var t = 0; t < e; t += 8) swap(this, t, t + 7), swap(this, t + 1, t + 6), swap(this, t + 2, t + 5), swap(this, t + 3, t + 4);
				return this
			}, Buffer.prototype.toString = function() {
				var e = this.length;
				return 0 === e ? "" : 0 === arguments.length ? utf8Slice(this, 0, e) : slowToString.apply(this, arguments)
			}, Buffer.prototype.equals = function(e) {
				if (!Buffer.isBuffer(e)) throw new TypeError("Argument must be a Buffer");
				return this === e || 0 === Buffer.compare(this, e)
			}, Buffer.prototype.inspect = function() {
				var e = "",
					t = exports.INSPECT_MAX_BYTES;
				return this.length > 0 && (e = this.toString("hex", 0, t).match(/.{2}/g).join(" "), this.length > t && (e += " ... ")), "<Buffer " + e + ">"
			}, Buffer.prototype.compare = function(e, t, r, n, f) {
				if (!Buffer.isBuffer(e)) throw new TypeError("Argument must be a Buffer");
				if (void 0 === t && (t = 0), void 0 === r && (r = e ? e.length : 0), void 0 === n && (n = 0), void 0 === f && (f = this.length), t < 0 || r > e.length || n < 0 || f > this.length) throw new RangeError("out of range index");
				if (n >= f && t >= r) return 0;
				if (n >= f) return -1;
				if (t >= r) return 1;
				if (t >>>= 0, r >>>= 0, n >>>= 0, f >>>= 0, this === e) return 0;
				for (var i = f - n, o = r - t, u = Math.min(i, o), s = this.slice(n, f), a = e.slice(t, r), h = 0; h < u; ++h)
					if (s[h] !== a[h]) {
						i = s[h], o = a[h];
						break
					}
				return i < o ? -1 : o < i ? 1 : 0
			}, Buffer.prototype.includes = function(e, t, r) {
				return -1 !== this.indexOf(e, t, r)
			}, Buffer.prototype.indexOf = function(e, t, r) {
				return bidirectionalIndexOf(this, e, t, r, !0)
			}, Buffer.prototype.lastIndexOf = function(e, t, r) {
				return bidirectionalIndexOf(this, e, t, r, !1)
			}, Buffer.prototype.write = function(e, t, r, n) {
				if (void 0 === t) n = "utf8", r = this.length, t = 0;
				else if (void 0 === r && "string" == typeof t) n = t, r = this.length, t = 0;
				else {
					if (!isFinite(t)) throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
					t >>>= 0, isFinite(r) ? (r >>>= 0, void 0 === n && (n = "utf8")) : (n = r, r = void 0)
				}
				var f = this.length - t;
				if ((void 0 === r || r > f) && (r = f), e.length > 0 && (r < 0 || t < 0) || t > this.length) throw new RangeError("Attempt to write outside buffer bounds");
				n || (n = "utf8");
				for (var i = !1;;) switch (n) {
					case "hex":
						return hexWrite(this, e, t, r);
					case "utf8":
					case "utf-8":
						return utf8Write(this, e, t, r);
					case "ascii":
						return asciiWrite(this, e, t, r);
					case "latin1":
					case "binary":
						return latin1Write(this, e, t, r);
					case "base64":
						return base64Write(this, e, t, r);
					case "ucs2":
					case "ucs-2":
					case "utf16le":
					case "utf-16le":
						return ucs2Write(this, e, t, r);
					default:
						if (i) throw new TypeError("Unknown encoding: " + n);
						n = ("" + n).toLowerCase(), i = !0
				}
			}, Buffer.prototype.toJSON = function() {
				return {
					type: "Buffer",
					data: Array.prototype.slice.call(this._arr || this, 0)
				}
			};
			var MAX_ARGUMENTS_LENGTH = 4096;
			Buffer.prototype.slice = function(e, t) {
				var r = this.length;
				e = ~~e, t = void 0 === t ? r : ~~t, e < 0 ? (e += r) < 0 && (e = 0) : e > r && (e = r), t < 0 ? (t += r) < 0 && (t = 0) : t > r && (t = r), t < e && (t = e);
				var n = this.subarray(e, t);
				return n.__proto__ = Buffer.prototype, n
			}, Buffer.prototype.readUIntLE = function(e, t, r) {
				e >>>= 0, t >>>= 0, r || checkOffset(e, t, this.length);
				for (var n = this[e], f = 1, i = 0; ++i < t && (f *= 256);) n += this[e + i] * f;
				return n
			}, Buffer.prototype.readUIntBE = function(e, t, r) {
				e >>>= 0, t >>>= 0, r || checkOffset(e, t, this.length);
				for (var n = this[e + --t], f = 1; t > 0 && (f *= 256);) n += this[e + --t] * f;
				return n
			}, Buffer.prototype.readUInt8 = function(e, t) {
				return e >>>= 0, t || checkOffset(e, 1, this.length), this[e]
			}, Buffer.prototype.readUInt16LE = function(e, t) {
				return e >>>= 0, t || checkOffset(e, 2, this.length), this[e] | this[e + 1] << 8
			}, Buffer.prototype.readUInt16BE = function(e, t) {
				return e >>>= 0, t || checkOffset(e, 2, this.length), this[e] << 8 | this[e + 1]
			}, Buffer.prototype.readUInt32LE = function(e, t) {
				return e >>>= 0, t || checkOffset(e, 4, this.length), (this[e] | this[e + 1] << 8 | this[e + 2] << 16) + 16777216 * this[e + 3]
			}, Buffer.prototype.readUInt32BE = function(e, t) {
				return e >>>= 0, t || checkOffset(e, 4, this.length), 16777216 * this[e] + (this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3])
			}, Buffer.prototype.readIntLE = function(e, t, r) {
				e >>>= 0, t >>>= 0, r || checkOffset(e, t, this.length);
				for (var n = this[e], f = 1, i = 0; ++i < t && (f *= 256);) n += this[e + i] * f;
				return f *= 128, n >= f && (n -= Math.pow(2, 8 * t)), n
			}, Buffer.prototype.readIntBE = function(e, t, r) {
				e >>>= 0, t >>>= 0, r || checkOffset(e, t, this.length);
				for (var n = t, f = 1, i = this[e + --n]; n > 0 && (f *= 256);) i += this[e + --n] * f;
				return f *= 128, i >= f && (i -= Math.pow(2, 8 * t)), i
			}, Buffer.prototype.readInt8 = function(e, t) {
				return e >>>= 0, t || checkOffset(e, 1, this.length), 128 & this[e] ? -1 * (255 - this[e] + 1) : this[e]
			}, Buffer.prototype.readInt16LE = function(e, t) {
				e >>>= 0, t || checkOffset(e, 2, this.length);
				var r = this[e] | this[e + 1] << 8;
				return 32768 & r ? 4294901760 | r : r
			}, Buffer.prototype.readInt16BE = function(e, t) {
				e >>>= 0, t || checkOffset(e, 2, this.length);
				var r = this[e + 1] | this[e] << 8;
				return 32768 & r ? 4294901760 | r : r
			}, Buffer.prototype.readInt32LE = function(e, t) {
				return e >>>= 0, t || checkOffset(e, 4, this.length), this[e] | this[e + 1] << 8 | this[e + 2] << 16 | this[e + 3] << 24
			}, Buffer.prototype.readInt32BE = function(e, t) {
				return e >>>= 0, t || checkOffset(e, 4, this.length), this[e] << 24 | this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3]
			}, Buffer.prototype.readFloatLE = function(e, t) {
				return e >>>= 0, t || checkOffset(e, 4, this.length), ieee754.read(this, e, !0, 23, 4)
			}, Buffer.prototype.readFloatBE = function(e, t) {
				return e >>>= 0, t || checkOffset(e, 4, this.length), ieee754.read(this, e, !1, 23, 4)
			}, Buffer.prototype.readDoubleLE = function(e, t) {
				return e >>>= 0, t || checkOffset(e, 8, this.length), ieee754.read(this, e, !0, 52, 8)
			}, Buffer.prototype.readDoubleBE = function(e, t) {
				return e >>>= 0, t || checkOffset(e, 8, this.length), ieee754.read(this, e, !1, 52, 8)
			}, Buffer.prototype.writeUIntLE = function(e, t, r, n) {
				e = +e, t >>>= 0, r >>>= 0, n || checkInt(this, e, t, r, Math.pow(2, 8 * r) - 1, 0);
				var f = 1,
					i = 0;
				for (this[t] = 255 & e; ++i < r && (f *= 256);) this[t + i] = e / f & 255;
				return t + r
			}, Buffer.prototype.writeUIntBE = function(e, t, r, n) {
				e = +e, t >>>= 0, r >>>= 0, n || checkInt(this, e, t, r, Math.pow(2, 8 * r) - 1, 0);
				var f = r - 1,
					i = 1;
				for (this[t + f] = 255 & e; --f >= 0 && (i *= 256);) this[t + f] = e / i & 255;
				return t + r
			}, Buffer.prototype.writeUInt8 = function(e, t, r) {
				return e = +e, t >>>= 0, r || checkInt(this, e, t, 1, 255, 0), this[t] = 255 & e, t + 1
			}, Buffer.prototype.writeUInt16LE = function(e, t, r) {
				return e = +e, t >>>= 0, r || checkInt(this, e, t, 2, 65535, 0), this[t] = 255 & e, this[t + 1] = e >>> 8, t + 2
			}, Buffer.prototype.writeUInt16BE = function(e, t, r) {
				return e = +e, t >>>= 0, r || checkInt(this, e, t, 2, 65535, 0), this[t] = e >>> 8, this[t + 1] = 255 & e, t + 2
			}, Buffer.prototype.writeUInt32LE = function(e, t, r) {
				return e = +e, t >>>= 0, r || checkInt(this, e, t, 4, 4294967295, 0), this[t + 3] = e >>> 24, this[t + 2] = e >>> 16, this[t + 1] = e >>> 8, this[t] = 255 & e, t + 4
			}, Buffer.prototype.writeUInt32BE = function(e, t, r) {
				return e = +e, t >>>= 0, r || checkInt(this, e, t, 4, 4294967295, 0), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = 255 & e, t + 4
			}, Buffer.prototype.writeIntLE = function(e, t, r, n) {
				if (e = +e, t >>>= 0, !n) {
					var f = Math.pow(2, 8 * r - 1);
					checkInt(this, e, t, r, f - 1, -f)
				}
				var i = 0,
					o = 1,
					u = 0;
				for (this[t] = 255 & e; ++i < r && (o *= 256);) e < 0 && 0 === u && 0 !== this[t + i - 1] && (u = 1), this[t + i] = (e / o >> 0) - u & 255;
				return t + r
			}, Buffer.prototype.writeIntBE = function(e, t, r, n) {
				if (e = +e, t >>>= 0, !n) {
					var f = Math.pow(2, 8 * r - 1);
					checkInt(this, e, t, r, f - 1, -f)
				}
				var i = r - 1,
					o = 1,
					u = 0;
				for (this[t + i] = 255 & e; --i >= 0 && (o *= 256);) e < 0 && 0 === u && 0 !== this[t + i + 1] && (u = 1), this[t + i] = (e / o >> 0) - u & 255;
				return t + r
			}, Buffer.prototype.writeInt8 = function(e, t, r) {
				return e = +e, t >>>= 0, r || checkInt(this, e, t, 1, 127, -128), e < 0 && (e = 255 + e + 1), this[t] = 255 & e, t + 1
			}, Buffer.prototype.writeInt16LE = function(e, t, r) {
				return e = +e, t >>>= 0, r || checkInt(this, e, t, 2, 32767, -32768), this[t] = 255 & e, this[t + 1] = e >>> 8, t + 2
			}, Buffer.prototype.writeInt16BE = function(e, t, r) {
				return e = +e, t >>>= 0, r || checkInt(this, e, t, 2, 32767, -32768), this[t] = e >>> 8, this[t + 1] = 255 & e, t + 2
			}, Buffer.prototype.writeInt32LE = function(e, t, r) {
				return e = +e, t >>>= 0, r || checkInt(this, e, t, 4, 2147483647, -2147483648), this[t] = 255 & e, this[t + 1] = e >>> 8, this[t + 2] = e >>> 16, this[t + 3] = e >>> 24, t + 4
			}, Buffer.prototype.writeInt32BE = function(e, t, r) {
				return e = +e, t >>>= 0, r || checkInt(this, e, t, 4, 2147483647, -2147483648), e < 0 && (e = 4294967295 + e + 1), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = 255 & e, t + 4
			}, Buffer.prototype.writeFloatLE = function(e, t, r) {
				return writeFloat(this, e, t, !0, r)
			}, Buffer.prototype.writeFloatBE = function(e, t, r) {
				return writeFloat(this, e, t, !1, r)
			}, Buffer.prototype.writeDoubleLE = function(e, t, r) {
				return writeDouble(this, e, t, !0, r)
			}, Buffer.prototype.writeDoubleBE = function(e, t, r) {
				return writeDouble(this, e, t, !1, r)
			}, Buffer.prototype.copy = function(e, t, r, n) {
				if (r || (r = 0), n || 0 === n || (n = this.length), t >= e.length && (t = e.length), t || (t = 0), n > 0 && n < r && (n = r), n === r) return 0;
				if (0 === e.length || 0 === this.length) return 0;
				if (t < 0) throw new RangeError("targetStart out of bounds");
				if (r < 0 || r >= this.length) throw new RangeError("sourceStart out of bounds");
				if (n < 0) throw new RangeError("sourceEnd out of bounds");
				n > this.length && (n = this.length), e.length - t < n - r && (n = e.length - t + r);
				var f, i = n - r;
				if (this === e && r < t && t < n)
					for (f = i - 1; f >= 0; --f) e[f + t] = this[f + r];
				else if (i < 1e3)
					for (f = 0; f < i; ++f) e[f + t] = this[f + r];
				else Uint8Array.prototype.set.call(e, this.subarray(r, r + i), t);
				return i
			}, Buffer.prototype.fill = function(e, t, r, n) {
				if ("string" == typeof e) {
					if ("string" == typeof t ? (n = t, t = 0, r = this.length) : "string" == typeof r && (n = r, r = this.length), 1 === e.length) {
						var f = e.charCodeAt(0);
						f < 256 && (e = f)
					}
					if (void 0 !== n && "string" != typeof n) throw new TypeError("encoding must be a string");
					if ("string" == typeof n && !Buffer.isEncoding(n)) throw new TypeError("Unknown encoding: " + n)
				} else "number" == typeof e && (e &= 255);
				if (t < 0 || this.length < t || this.length < r) throw new RangeError("Out of range index");
				if (r <= t) return this;
				t >>>= 0, r = void 0 === r ? this.length : r >>> 0, e || (e = 0);
				var i;
				if ("number" == typeof e)
					for (i = t; i < r; ++i) this[i] = e;
				else {
					var o = Buffer.isBuffer(e) ? e : new Buffer(e, n),
						u = o.length;
					for (i = 0; i < r - t; ++i) this[i + t] = o[i % u]
				}
				return this
			};
			var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

		}, {
			"base64-js": 8,
			"ieee754": 18
		}],
		12: [function(require, module, exports) {
			(function(Buffer) {
				function isArray(r) {
					return Array.isArray ? Array.isArray(r) : "[object Array]" === objectToString(r)
				}

				function isBoolean(r) {
					return "boolean" == typeof r
				}

				function isNull(r) {
					return null === r
				}

				function isNullOrUndefined(r) {
					return null == r
				}

				function isNumber(r) {
					return "number" == typeof r
				}

				function isString(r) {
					return "string" == typeof r
				}

				function isSymbol(r) {
					return "symbol" == typeof r
				}

				function isUndefined(r) {
					return void 0 === r
				}

				function isRegExp(r) {
					return "[object RegExp]" === objectToString(r)
				}

				function isObject(r) {
					return "object" == typeof r && null !== r
				}

				function isDate(r) {
					return "[object Date]" === objectToString(r)
				}

				function isError(r) {
					return "[object Error]" === objectToString(r) || r instanceof Error
				}

				function isFunction(r) {
					return "function" == typeof r
				}

				function isPrimitive(r) {
					return null === r || "boolean" == typeof r || "number" == typeof r || "string" == typeof r || "symbol" == typeof r || void 0 === r
				}

				function objectToString(r) {
					return Object.prototype.toString.call(r)
				}
				exports.isArray = isArray, exports.isBoolean = isBoolean, exports.isNull = isNull, exports.isNullOrUndefined = isNullOrUndefined, exports.isNumber = isNumber, exports.isString = isString, exports.isSymbol = isSymbol, exports.isUndefined = isUndefined, exports.isRegExp = isRegExp, exports.isObject = isObject, exports.isDate = isDate, exports.isError = isError, exports.isFunction = isFunction, exports.isPrimitive = isPrimitive, exports.isBuffer = Buffer.isBuffer;

			}).call(this, {
				"isBuffer": require("../../is-buffer/index.js")
			})
		}, {
			"../../is-buffer/index.js": 20
		}],
		13: [function(require, module, exports) {
			(function(process, Buffer) {
				var stream = require("readable-stream"),
					eos = require("end-of-stream"),
					inherits = require("inherits"),
					shift = require("stream-shift"),
					SIGNAL_FLUSH = new Buffer([0]),
					onuncork = function(e, t) {
						e._corked ? e.once("uncork", t) : t()
					},
					destroyer = function(e, t) {
						return function(i) {
							i ? e.destroy("premature close" === i.message ? null : i) : t && !e._ended && e.end()
						}
					},
					end = function(e, t) {
						return e ? e._writableState && e._writableState.finished ? t() : e._writableState ? e.end(t) : (e.end(), void t()) : t()
					},
					toStreams2 = function(e) {
						return new stream.Readable({
							objectMode: !0,
							highWaterMark: 16
						}).wrap(e)
					},
					Duplexify = function(e, t, i) {
						if (!(this instanceof Duplexify)) return new Duplexify(e, t, i);
						stream.Duplex.call(this, i), this._writable = null, this._readable = null, this._readable2 = null, this._forwardDestroy = !i || !1 !== i.destroy, this._forwardEnd = !i || !1 !== i.end, this._corked = 1, this._ondrain = null, this._drained = !1, this._forwarding = !1, this._unwrite = null, this._unread = null, this._ended = !1, this.destroyed = !1, e && this.setWritable(e), t && this.setReadable(t)
					};
				inherits(Duplexify, stream.Duplex), Duplexify.obj = function(e, t, i) {
					return i || (i = {}), i.objectMode = !0, i.highWaterMark = 16, new Duplexify(e, t, i)
				}, Duplexify.prototype.cork = function() {
					1 == ++this._corked && this.emit("cork")
				}, Duplexify.prototype.uncork = function() {
					this._corked && 0 == --this._corked && this.emit("uncork")
				}, Duplexify.prototype.setWritable = function(e) {
					if (this._unwrite && this._unwrite(), this.destroyed) e && e.destroy && e.destroy();
					else if (null !== e && !1 !== e) {
						var t = this,
							i = eos(e, {
								writable: !0,
								readable: !1
							}, destroyer(this, this._forwardEnd)),
							r = function() {
								var e = t._ondrain;
								t._ondrain = null, e && e()
							};
						this._unwrite && process.nextTick(r), this._writable = e, this._writable.on("drain", r), this._unwrite = function() {
							t._writable.removeListener("drain", r), i()
						}, this.uncork()
					} else this.end()
				}, Duplexify.prototype.setReadable = function(e) {
					if (this._unread && this._unread(), this.destroyed) e && e.destroy && e.destroy();
					else {
						if (null === e || !1 === e) return this.push(null), void this.resume();
						var t = this,
							i = eos(e, {
								writable: !1,
								readable: !0
							}, destroyer(this)),
							r = function() {
								t._forward()
							},
							n = function() {
								t.push(null)
							};
						this._drained = !0, this._readable = e, this._readable2 = e._readableState ? e : toStreams2(e), this._readable2.on("readable", r), this._readable2.on("end", n), this._unread = function() {
							t._readable2.removeListener("readable", r), t._readable2.removeListener("end", n), i()
						}, this._forward()
					}
				}, Duplexify.prototype._read = function() {
					this._drained = !0, this._forward()
				}, Duplexify.prototype._forward = function() {
					if (!this._forwarding && this._readable2 && this._drained) {
						this._forwarding = !0;
						for (var e; this._drained && null !== (e = shift(this._readable2));) this.destroyed || (this._drained = this.push(e));
						this._forwarding = !1
					}
				}, Duplexify.prototype.destroy = function(e) {
					if (!this.destroyed) {
						this.destroyed = !0;
						var t = this;
						process.nextTick(function() {
							t._destroy(e)
						})
					}
				}, Duplexify.prototype._destroy = function(e) {
					if (e) {
						var t = this._ondrain;
						this._ondrain = null, t ? t(e) : this.emit("error", e)
					}
					this._forwardDestroy && (this._readable && this._readable.destroy && this._readable.destroy(), this._writable && this._writable.destroy && this._writable.destroy()), this.emit("close")
				}, Duplexify.prototype._write = function(e, t, i) {
					return this.destroyed ? i() : this._corked ? onuncork(this, this._write.bind(this, e, t, i)) : e === SIGNAL_FLUSH ? this._finish(i) : this._writable ? void(!1 === this._writable.write(e) ? this._ondrain = i : i()) : i()
				}, Duplexify.prototype._finish = function(e) {
					var t = this;
					this.emit("preend"), onuncork(this, function() {
						end(t._forwardEnd && t._writable, function() {
							!1 === t._writableState.prefinished && (t._writableState.prefinished = !0), t.emit("prefinish"), onuncork(t, e)
						})
					})
				}, Duplexify.prototype.end = function(e, t, i) {
					return "function" == typeof e ? this.end(null, null, e) : "function" == typeof t ? this.end(e, null, t) : (this._ended = !0, e && this.write(e), this._writableState.ending || this.write(SIGNAL_FLUSH), stream.Writable.prototype.end.call(this, i))
				}, module.exports = Duplexify;

			}).call(this, require('_process'), require("buffer").Buffer)
		}, {
			"_process": 31,
			"buffer": 11,
			"end-of-stream": 14,
			"inherits": 19,
			"readable-stream": 45,
			"stream-shift": 48
		}],
		14: [function(require, module, exports) {
			var once = require("once"),
				noop = function() {},
				isRequest = function(e) {
					return e.setHeader && "function" == typeof e.abort
				},
				eos = function(e, r, n) {
					if ("function" == typeof r) return eos(e, null, r);
					r || (r = {}), n = once(n || noop);
					var o = e._writableState,
						t = e._readableState,
						i = r.readable || !1 !== r.readable && e.readable,
						s = r.writable || !1 !== r.writable && e.writable,
						u = function() {
							e.writable || a()
						},
						a = function() {
							s = !1, i || n()
						},
						c = function() {
							i = !1, s || n()
						},
						l = function() {
							return (!i || t && t.ended) && (!s || o && o.ended) ? void 0 : n(new Error("premature close"))
						},
						f = function() {
							e.req.on("finish", a)
						};
					return isRequest(e) ? (e.on("complete", a), e.on("abort", l), e.req ? f() : e.on("request", f)) : s && !o && (e.on("end", u), e.on("close", u)), e.on("end", c), e.on("finish", a), !1 !== r.error && e.on("error", n), e.on("close", l),
						function() {
							e.removeListener("complete", a), e.removeListener("abort", l), e.removeListener("request", f), e.req && e.req.removeListener("finish", a), e.removeListener("end", u), e.removeListener("close", u), e.removeListener("finish", a), e.removeListener("end", c), e.removeListener("error", n), e.removeListener("close", l)
						}
				};
			module.exports = eos;

		}, {
			"once": 15
		}],
		15: [function(require, module, exports) {
			function once(e) {
				var n = function() {
					return n.called ? n.value : (n.called = !0, n.value = e.apply(this, arguments))
				};
				return n.called = !1, n
			}
			var wrappy = require("wrappy");
			module.exports = wrappy(once), once.proto = once(function() {
				Object.defineProperty(Function.prototype, "once", {
					value: function() {
						return once(this)
					},
					configurable: !0
				})
			});

		}, {
			"wrappy": 58
		}],
		16: [function(require, module, exports) {
			var once = require("once"),
				noop = function() {},
				isRequest = function(e) {
					return e.setHeader && "function" == typeof e.abort
				},
				isChildProcess = function(e) {
					return e.stdio && Array.isArray(e.stdio) && 3 === e.stdio.length
				},
				eos = function(e, r, n) {
					if ("function" == typeof r) return eos(e, null, r);
					r || (r = {}), n = once(n || noop);
					var o = e._writableState,
						t = e._readableState,
						i = r.readable || !1 !== r.readable && e.readable,
						s = r.writable || !1 !== r.writable && e.writable,
						l = function() {
							e.writable || c()
						},
						c = function() {
							s = !1, i || n.call(e)
						},
						a = function() {
							i = !1, s || n.call(e)
						},
						u = function(r) {
							n.call(e, r ? new Error("exited with error code: " + r) : null)
						},
						d = function() {
							return (!i || t && t.ended) && (!s || o && o.ended) ? void 0 : n.call(e, new Error("premature close"))
						},
						f = function() {
							e.req.on("finish", c)
						};
					return isRequest(e) ? (e.on("complete", c), e.on("abort", d), e.req ? f() : e.on("request", f)) : s && !o && (e.on("end", l), e.on("close", l)), isChildProcess(e) && e.on("exit", u), e.on("end", a), e.on("finish", c), !1 !== r.error && e.on("error", n), e.on("close", d),
						function() {
							e.removeListener("complete", c), e.removeListener("abort", d), e.removeListener("request", f), e.req && e.req.removeListener("finish", c), e.removeListener("end", l), e.removeListener("close", l), e.removeListener("finish", c), e.removeListener("exit", u), e.removeListener("end", a), e.removeListener("error", n), e.removeListener("close", d)
						}
				};
			module.exports = eos;

		}, {
			"once": 29
		}],
		17: [function(require, module, exports) {
			function EventEmitter() {
				this._events = this._events || {}, this._maxListeners = this._maxListeners || void 0
			}

			function isFunction(e) {
				return "function" == typeof e
			}

			function isNumber(e) {
				return "number" == typeof e
			}

			function isObject(e) {
				return "object" == typeof e && null !== e
			}

			function isUndefined(e) {
				return void 0 === e
			}
			module.exports = EventEmitter, EventEmitter.EventEmitter = EventEmitter, EventEmitter.prototype._events = void 0, EventEmitter.prototype._maxListeners = void 0, EventEmitter.defaultMaxListeners = 10, EventEmitter.prototype.setMaxListeners = function(e) {
				if (!isNumber(e) || e < 0 || isNaN(e)) throw TypeError("n must be a positive number");
				return this._maxListeners = e, this
			}, EventEmitter.prototype.emit = function(e) {
				var t, i, n, s, r, o;
				if (this._events || (this._events = {}), "error" === e && (!this._events.error || isObject(this._events.error) && !this._events.error.length)) {
					if ((t = arguments[1]) instanceof Error) throw t;
					var h = new Error('Uncaught, unspecified "error" event. (' + t + ")");
					throw h.context = t, h
				}
				if (i = this._events[e], isUndefined(i)) return !1;
				if (isFunction(i)) switch (arguments.length) {
					case 1:
						i.call(this);
						break;
					case 2:
						i.call(this, arguments[1]);
						break;
					case 3:
						i.call(this, arguments[1], arguments[2]);
						break;
					default:
						s = Array.prototype.slice.call(arguments, 1), i.apply(this, s)
				} else if (isObject(i))
					for (s = Array.prototype.slice.call(arguments, 1), n = (o = i.slice()).length, r = 0; r < n; r++) o[r].apply(this, s);
				return !0
			}, EventEmitter.prototype.addListener = function(e, t) {
				var i;
				if (!isFunction(t)) throw TypeError("listener must be a function");
				return this._events || (this._events = {}), this._events.newListener && this.emit("newListener", e, isFunction(t.listener) ? t.listener : t), this._events[e] ? isObject(this._events[e]) ? this._events[e].push(t) : this._events[e] = [this._events[e], t] : this._events[e] = t, isObject(this._events[e]) && !this._events[e].warned && (i = isUndefined(this._maxListeners) ? EventEmitter.defaultMaxListeners : this._maxListeners) && i > 0 && this._events[e].length > i && (this._events[e].warned = !0, console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.", this._events[e].length), "function" == typeof console.trace && console.trace()), this
			}, EventEmitter.prototype.on = EventEmitter.prototype.addListener, EventEmitter.prototype.once = function(e, t) {
				function i() {
					this.removeListener(e, i), n || (n = !0, t.apply(this, arguments))
				}
				if (!isFunction(t)) throw TypeError("listener must be a function");
				var n = !1;
				return i.listener = t, this.on(e, i), this
			}, EventEmitter.prototype.removeListener = function(e, t) {
				var i, n, s, r;
				if (!isFunction(t)) throw TypeError("listener must be a function");
				if (!this._events || !this._events[e]) return this;
				if (i = this._events[e], s = i.length, n = -1, i === t || isFunction(i.listener) && i.listener === t) delete this._events[e], this._events.removeListener && this.emit("removeListener", e, t);
				else if (isObject(i)) {
					for (r = s; r-- > 0;)
						if (i[r] === t || i[r].listener && i[r].listener === t) {
							n = r;
							break
						}
					if (n < 0) return this;
					1 === i.length ? (i.length = 0, delete this._events[e]) : i.splice(n, 1), this._events.removeListener && this.emit("removeListener", e, t)
				}
				return this
			}, EventEmitter.prototype.removeAllListeners = function(e) {
				var t, i;
				if (!this._events) return this;
				if (!this._events.removeListener) return 0 === arguments.length ? this._events = {} : this._events[e] && delete this._events[e], this;
				if (0 === arguments.length) {
					for (t in this._events) "removeListener" !== t && this.removeAllListeners(t);
					return this.removeAllListeners("removeListener"), this._events = {}, this
				}
				if (i = this._events[e], isFunction(i)) this.removeListener(e, i);
				else if (i)
					for (; i.length;) this.removeListener(e, i[i.length - 1]);
				return delete this._events[e], this
			}, EventEmitter.prototype.listeners = function(e) {
				return this._events && this._events[e] ? isFunction(this._events[e]) ? [this._events[e]] : this._events[e].slice() : []
			}, EventEmitter.prototype.listenerCount = function(e) {
				if (this._events) {
					var t = this._events[e];
					if (isFunction(t)) return 1;
					if (t) return t.length
				}
				return 0
			}, EventEmitter.listenerCount = function(e, t) {
				return e.listenerCount(t)
			};

		}, {}],
		18: [function(require, module, exports) {
			exports.read = function(a, o, t, r, h) {
				var M, p, w = 8 * h - r - 1,
					f = (1 << w) - 1,
					e = f >> 1,
					i = -7,
					N = t ? h - 1 : 0,
					n = t ? -1 : 1,
					s = a[o + N];
				for (N += n, M = s & (1 << -i) - 1, s >>= -i, i += w; i > 0; M = 256 * M + a[o + N], N += n, i -= 8);
				for (p = M & (1 << -i) - 1, M >>= -i, i += r; i > 0; p = 256 * p + a[o + N], N += n, i -= 8);
				if (0 === M) M = 1 - e;
				else {
					if (M === f) return p ? NaN : 1 / 0 * (s ? -1 : 1);
					p += Math.pow(2, r), M -= e
				}
				return (s ? -1 : 1) * p * Math.pow(2, M - r)
			}, exports.write = function(a, o, t, r, h, M) {
				var p, w, f, e = 8 * M - h - 1,
					i = (1 << e) - 1,
					N = i >> 1,
					n = 23 === h ? Math.pow(2, -24) - Math.pow(2, -77) : 0,
					s = r ? 0 : M - 1,
					u = r ? 1 : -1,
					l = o < 0 || 0 === o && 1 / o < 0 ? 1 : 0;
				for (o = Math.abs(o), isNaN(o) || o === 1 / 0 ? (w = isNaN(o) ? 1 : 0, p = i) : (p = Math.floor(Math.log(o) / Math.LN2), o * (f = Math.pow(2, -p)) < 1 && (p--, f *= 2), (o += p + N >= 1 ? n / f : n * Math.pow(2, 1 - N)) * f >= 2 && (p++, f /= 2), p + N >= i ? (w = 0, p = i) : p + N >= 1 ? (w = (o * f - 1) * Math.pow(2, h), p += N) : (w = o * Math.pow(2, N - 1) * Math.pow(2, h), p = 0)); h >= 8; a[t + s] = 255 & w, s += u, w /= 256, h -= 8);
				for (p = p << h | w, e += h; e > 0; a[t + s] = 255 & p, s += u, p /= 256, e -= 8);
				a[t + s - u] |= 128 * l
			};

		}, {}],
		19: [function(require, module, exports) {
			"function" == typeof Object.create ? module.exports = function(t, e) {
				t.super_ = e, t.prototype = Object.create(e.prototype, {
					constructor: {
						value: t,
						enumerable: !1,
						writable: !0,
						configurable: !0
					}
				})
			} : module.exports = function(t, e) {
				t.super_ = e;
				var o = function() {};
				o.prototype = e.prototype, t.prototype = new o, t.prototype.constructor = t
			};

		}, {}],
		20: [function(require, module, exports) {
			function isBuffer(f) {
				return !!f.constructor && "function" == typeof f.constructor.isBuffer && f.constructor.isBuffer(f)
			}

			function isSlowBuffer(f) {
				return "function" == typeof f.readFloatLE && "function" == typeof f.slice && isBuffer(f.slice(0, 0))
			}
			module.exports = function(f) {
				return null != f && (isBuffer(f) || isSlowBuffer(f) || !!f._isBuffer)
			};

		}, {}],
		21: [function(require, module, exports) {
			var toString = {}.toString;
			module.exports = Array.isArray || function(r) {
				return "[object Array]" == toString.call(r)
			};

		}, {}],
		22: [function(require, module, exports) {
			"use strict";

			function genHeader(o) {
				return [0, 1, 2].map(function(r) {
					return [0, 1].map(function(c) {
						return [0, 1].map(function(e) {
							var p = new Buffer(1);
							return p.writeUInt8(protocol.codes[o] << protocol.CMD_SHIFT | (c ? protocol.DUP_MASK : 0) | r << protocol.QOS_SHIFT | e, 0, !0), p
						})
					})
				})
			}
			var Buffer = require("safe-buffer").Buffer,
				protocol = module.exports;
			protocol.types = {
				0: "reserved",
				1: "connect",
				2: "connack",
				3: "publish",
				4: "puback",
				5: "pubrec",
				6: "pubrel",
				7: "pubcomp",
				8: "subscribe",
				9: "suback",
				10: "unsubscribe",
				11: "unsuback",
				12: "pingreq",
				13: "pingresp",
				14: "disconnect",
				15: "reserved"
			}, protocol.codes = {};
			for (var k in protocol.types) {
				var v = protocol.types[k];
				protocol.codes[v] = k
			}
			protocol.CMD_SHIFT = 4, protocol.CMD_MASK = 240, protocol.DUP_MASK = 8, protocol.QOS_MASK = 3, protocol.QOS_SHIFT = 1, protocol.RETAIN_MASK = 1, protocol.LENGTH_MASK = 127, protocol.LENGTH_FIN_MASK = 128, protocol.SESSIONPRESENT_MASK = 1, protocol.SESSIONPRESENT_HEADER = Buffer.from([protocol.SESSIONPRESENT_MASK]), protocol.CONNACK_HEADER = Buffer.from([protocol.codes.connack << protocol.CMD_SHIFT]), protocol.USERNAME_MASK = 128, protocol.PASSWORD_MASK = 64, protocol.WILL_RETAIN_MASK = 32, protocol.WILL_QOS_MASK = 24, protocol.WILL_QOS_SHIFT = 3, protocol.WILL_FLAG_MASK = 4, protocol.CLEAN_SESSION_MASK = 2, protocol.CONNECT_HEADER = Buffer.from([protocol.codes.connect << protocol.CMD_SHIFT]), protocol.PUBLISH_HEADER = genHeader("publish"), protocol.SUBSCRIBE_HEADER = genHeader("subscribe"), protocol.UNSUBSCRIBE_HEADER = genHeader("unsubscribe"), protocol.ACKS = {
				unsuback: genHeader("unsuback"),
				puback: genHeader("puback"),
				pubcomp: genHeader("pubcomp"),
				pubrel: genHeader("pubrel"),
				pubrec: genHeader("pubrec")
			}, protocol.SUBACK_HEADER = Buffer.from([protocol.codes.suback << protocol.CMD_SHIFT]), protocol.VERSION3 = Buffer.from([3]), protocol.VERSION4 = Buffer.from([4]), protocol.QOS = [0, 1, 2].map(function(o) {
				return Buffer.from([o])
			}), protocol.EMPTY = {
				pingreq: Buffer.from([protocol.codes.pingreq << 4, 0]),
				pingresp: Buffer.from([protocol.codes.pingresp << 4, 0]),
				disconnect: Buffer.from([protocol.codes.disconnect << 4, 0])
			};

		}, {
			"safe-buffer": 47
		}],
		23: [function(require, module, exports) {
			"use strict";

			function generate(r) {
				var e = new Accumulator;
				return writeToStream(r, e), e.concat()
			}

			function Accumulator() {
				this._array = new Array(20), this._i = 0
			}
			var Buffer = require("safe-buffer").Buffer,
				writeToStream = require("./writeToStream"),
				EE = require("events").EventEmitter,
				inherits = require("inherits");
			inherits(Accumulator, EE), Accumulator.prototype.write = function(r) {
				return this._array[this._i++] = r, !0
			}, Accumulator.prototype.concat = function() {
				var r, e, t = 0,
					i = new Array(this._array.length),
					n = this._array,
					a = 0;
				for (r = 0; r < n.length && n[r]; r++) "string" != typeof n[r] ? i[r] = n[r].length : i[r] = Buffer.byteLength(n[r]), t += i[r];
				for (e = Buffer.allocUnsafe(t), r = 0; r < n.length && n[r]; r++) "string" != typeof n[r] ? (n[r].copy(e, a), a += i[r]) : (e.write(n[r], a), a += i[r]);
				return e
			}, module.exports = generate;

		}, {
			"./writeToStream": 28,
			"events": 17,
			"inherits": 19,
			"safe-buffer": 47
		}],
		24: [function(require, module, exports) {
			"use strict";
			exports.parser = require("./parser"), exports.generate = require("./generate"), exports.writeToStream = require("./writeToStream");

		}, {
			"./generate": 23,
			"./parser": 27,
			"./writeToStream": 28
		}],
		25: [function(require, module, exports) {
			"use strict";

			function generateBuffer(e) {
				var r = Buffer.allocUnsafe(2);
				return r.writeUInt8(e >> 8, 0, !0), r.writeUInt8(255 & e, 1, !0), r
			}

			function generateCache() {
				for (var e = 0; e < max; e++) cache[e] = generateBuffer(e)
			}
			var Buffer = require("safe-buffer").Buffer,
				max = 65536,
				cache = {};
			module.exports = {
				cache: cache,
				generateCache: generateCache,
				generateNumber: generateBuffer
			};

		}, {
			"safe-buffer": 47
		}],
		26: [function(require, module, exports) {
			function Packet() {
				this.cmd = null, this.retain = !1, this.qos = 0, this.dup = !1, this.length = -1, this.topic = null, this.payload = null
			}
			module.exports = Packet;

		}, {}],
		27: [function(require, module, exports) {
			"use strict";

			function Parser() {
				if (!(this instanceof Parser)) return new Parser;
				this._states = ["_parseHeader", "_parseLength", "_parsePayload", "_newPacket"], this._resetState()
			}
			var bl = require("bl"),
				inherits = require("inherits"),
				EE = require("events").EventEmitter,
				Packet = require("./packet"),
				constants = require("./constants");
			inherits(Parser, EE), Parser.prototype._resetState = function() {
				this.packet = new Packet, this.error = null, this._list = bl(), this._stateCounter = 0
			}, Parser.prototype.parse = function(t) {
				for (this.error && this._resetState(), this._list.append(t);
					(-1 !== this.packet.length || this._list.length > 0) && this[this._states[this._stateCounter]]() && !this.error;) ++this._stateCounter >= this._states.length && (this._stateCounter = 0);
				return this._list.length
			}, Parser.prototype._parseHeader = function() {
				var t = this._list.readUInt8(0);
				return this.packet.cmd = constants.types[t >> constants.CMD_SHIFT], this.packet.retain = 0 != (t & constants.RETAIN_MASK), this.packet.qos = t >> constants.QOS_SHIFT & constants.QOS_MASK, this.packet.dup = 0 != (t & constants.DUP_MASK), this._list.consume(1), !0
			}, Parser.prototype._parseLength = function() {
				for (var t, s = 0, r = 1, e = 0, i = !0; s < 5 && (t = this._list.readUInt8(s++), e += r * (t & constants.LENGTH_MASK), r *= 128, 0 != (t & constants.LENGTH_FIN_MASK));)
					if (this._list.length <= s) {
						i = !1;
						break
					}
				return i && (this.packet.length = e, this._list.consume(s)), i
			}, Parser.prototype._parsePayload = function() {
				var t = !1;
				if (0 === this.packet.length || this._list.length >= this.packet.length) {
					switch (this._pos = 0, this.packet.cmd) {
						case "connect":
							this._parseConnect();
							break;
						case "connack":
							this._parseConnack();
							break;
						case "publish":
							this._parsePublish();
							break;
						case "puback":
						case "pubrec":
						case "pubrel":
						case "pubcomp":
							this._parseMessageId();
							break;
						case "subscribe":
							this._parseSubscribe();
							break;
						case "suback":
							this._parseSuback();
							break;
						case "unsubscribe":
							this._parseUnsubscribe();
							break;
						case "unsuback":
							this._parseUnsuback();
							break;
						case "pingreq":
						case "pingresp":
						case "disconnect":
							break;
						default:
							this._emitError(new Error("Not supported"))
					}
					t = !0
				}
				return t
			}, Parser.prototype._parseConnect = function() {
				var t, s, r, e, i, n, a = {},
					o = this.packet;
				if (null === (t = this._parseString())) return this._emitError(new Error("Cannot parse protocolId"));
				if ("MQTT" !== t && "MQIsdp" !== t) return this._emitError(new Error("Invalid protocolId"));
				if (o.protocolId = t, this._pos >= this._list.length) return this._emitError(new Error("Packet too short"));
				if (o.protocolVersion = this._list.readUInt8(this._pos), 3 !== o.protocolVersion && 4 !== o.protocolVersion) return this._emitError(new Error("Invalid protocol version"));
				if (++this._pos >= this._list.length) return this._emitError(new Error("Packet too short"));
				if (a.username = this._list.readUInt8(this._pos) & constants.USERNAME_MASK, a.password = this._list.readUInt8(this._pos) & constants.PASSWORD_MASK, a.will = this._list.readUInt8(this._pos) & constants.WILL_FLAG_MASK, a.will && (o.will = {}, o.will.retain = 0 != (this._list.readUInt8(this._pos) & constants.WILL_RETAIN_MASK), o.will.qos = (this._list.readUInt8(this._pos) & constants.WILL_QOS_MASK) >> constants.WILL_QOS_SHIFT), o.clean = 0 != (this._list.readUInt8(this._pos) & constants.CLEAN_SESSION_MASK), this._pos++, o.keepalive = this._parseNum(), -1 === o.keepalive) return this._emitError(new Error("Packet too short"));
				if (null === (s = this._parseString())) return this._emitError(new Error("Packet too short"));
				if (o.clientId = s, a.will) {
					if (null === (r = this._parseString())) return this._emitError(new Error("Cannot parse will topic"));
					if (o.will.topic = r, null === (e = this._parseBuffer())) return this._emitError(new Error("Cannot parse will payload"));
					o.will.payload = e
				}
				if (a.username) {
					if (null === (n = this._parseString())) return this._emitError(new Error("Cannot parse username"));
					o.username = n
				}
				if (a.password) {
					if (null === (i = this._parseBuffer())) return this._emitError(new Error("Cannot parse password"));
					o.password = i
				}
				return o
			}, Parser.prototype._parseConnack = function() {
				var t = this.packet;
				return this._list.length < 2 ? null : (t.sessionPresent = !!(this._list.readUInt8(this._pos++) & constants.SESSIONPRESENT_MASK), t.returnCode = this._list.readUInt8(this._pos), -1 === t.returnCode ? this._emitError(new Error("Cannot parse return code")) : void 0)
			}, Parser.prototype._parsePublish = function() {
				var t = this.packet;
				if (t.topic = this._parseString(), null === t.topic) return this._emitError(new Error("Cannot parse topic"));
				t.qos > 0 && !this._parseMessageId() || (t.payload = this._list.slice(this._pos, t.length))
			}, Parser.prototype._parseSubscribe = function() {
				var t, s, r = this.packet;
				if (1 !== r.qos) return this._emitError(new Error("Wrong subscribe header"));
				if (r.subscriptions = [], this._parseMessageId())
					for (; this._pos < r.length;) {
						if (null === (t = this._parseString())) return this._emitError(new Error("Cannot parse topic"));
						s = this._list.readUInt8(this._pos++), r.subscriptions.push({
							topic: t,
							qos: s
						})
					}
			}, Parser.prototype._parseSuback = function() {
				if (this.packet.granted = [], this._parseMessageId())
					for (; this._pos < this.packet.length;) this.packet.granted.push(this._list.readUInt8(this._pos++))
			}, Parser.prototype._parseUnsubscribe = function() {
				var t = this.packet;
				if (t.unsubscriptions = [], this._parseMessageId())
					for (; this._pos < t.length;) {
						var s;
						if (null === (s = this._parseString())) return this._emitError(new Error("Cannot parse topic"));
						t.unsubscriptions.push(s)
					}
			}, Parser.prototype._parseUnsuback = function() {
				if (!this._parseMessageId()) return this._emitError(new Error("Cannot parse messageId"))
			}, Parser.prototype._parseMessageId = function() {
				var t = this.packet;
				return t.messageId = this._parseNum(), null !== t.messageId || (this._emitError(new Error("Cannot parse messageId")), !1)
			}, Parser.prototype._parseString = function(t) {
				var s, r = this._parseNum(),
					e = r + this._pos;
				return -1 === r || e > this._list.length || e > this.packet.length ? null : (s = this._list.toString("utf8", this._pos, e), this._pos += r, s)
			}, Parser.prototype._parseBuffer = function() {
				var t, s = this._parseNum(),
					r = s + this._pos;
				return -1 === s || r > this._list.length || r > this.packet.length ? null : (t = this._list.slice(this._pos, r), this._pos += s, t)
			}, Parser.prototype._parseNum = function() {
				if (this._list.length - this._pos < 2) return -1;
				var t = this._list.readUInt16BE(this._pos);
				return this._pos += 2, t
			}, Parser.prototype._newPacket = function() {
				return this.packet && (this._list.consume(this.packet.length), this.emit("packet", this.packet)), this.packet = new Packet, !0
			}, Parser.prototype._emitError = function(t) {
				this.error = t, this.emit("error", t)
			}, module.exports = Parser;

		}, {
			"./constants": 22,
			"./packet": 26,
			"bl": 9,
			"events": 17,
			"inherits": 19
		}],
		28: [function(require, module, exports) {
			"use strict";

			function generate(e, r) {
				switch (r.cork && (r.cork(), nextTick(uncork, r)), toGenerate && (toGenerate = !1, generateCache()), e.cmd) {
					case "connect":
						return connect(e, r);
					case "connack":
						return connack(e, r);
					case "publish":
						return publish(e, r);
					case "puback":
					case "pubrec":
					case "pubrel":
					case "pubcomp":
					case "unsuback":
						return confirmation(e, r);
					case "subscribe":
						return subscribe(e, r);
					case "suback":
						return suback(e, r);
					case "unsubscribe":
						return unsubscribe(e, r);
					case "pingreq":
					case "pingresp":
					case "disconnect":
						return emptyPacket(e, r);
					default:
						return r.emit("error", new Error("Unknown command")), !1
				}
			}

			function uncork(e) {
				e.uncork()
			}

			function connect(e, r) {
				var t = e || {},
					n = t.protocolId || "MQTT",
					o = t.protocolVersion || 4,
					i = t.will,
					u = t.clean,
					c = t.keepalive || 0,
					f = t.clientId || "",
					a = t.username,
					s = t.password;
				void 0 === u && (u = !0);
				var l = 0;
				if (!n || "string" != typeof n && !Buffer.isBuffer(n)) return r.emit("error", new Error("Invalid protocolId")), !1;
				if (l += n.length + 2, 3 !== o && 4 !== o) return r.emit("error", new Error("Invalid protocol version")), !1;
				if (l += 1, "string" != typeof f && !Buffer.isBuffer(f) || !f && 4 !== o || !f && !u) {
					if (o < 4) return r.emit("error", new Error("clientId must be supplied before 3.1.1")), !1;
					if (1 * u == 0) return r.emit("error", new Error("clientId must be given if cleanSession set to 0")), !1
				} else l += f.length + 2;
				if ("number" != typeof c || c < 0 || c > 65535 || c % 1 != 0) return r.emit("error", new Error("Invalid keepalive")), !1;
				if (l += 2, l += 1, i) {
					if ("object" != typeof i) return r.emit("error", new Error("Invalid will")), !1;
					if (!i.topic || "string" != typeof i.topic) return r.emit("error", new Error("Invalid will topic")), !1;
					if (l += Buffer.byteLength(i.topic) + 2, i.payload && i.payload) {
						if (!(i.payload.length >= 0)) return r.emit("error", new Error("Invalid will payload")), !1;
						"string" == typeof i.payload ? l += Buffer.byteLength(i.payload) + 2 : l += i.payload.length + 2
					} else l += 2
				}
				if (a) {
					if (!a.length) return r.emit("error", new Error("Invalid username")), !1;
					l += Buffer.byteLength(a) + 2
				}
				if (s) {
					if (!s.length) return r.emit("error", new Error("Invalid password")), !1;
					l += byteLength(s) + 2
				}
				r.write(protocol.CONNECT_HEADER), writeLength(r, l), writeStringOrBuffer(r, n), r.write(4 === o ? protocol.VERSION4 : protocol.VERSION3);
				var p = 0;
				return p |= a ? protocol.USERNAME_MASK : 0, p |= s ? protocol.PASSWORD_MASK : 0, p |= i && i.retain ? protocol.WILL_RETAIN_MASK : 0, p |= i && i.qos ? i.qos << protocol.WILL_QOS_SHIFT : 0, p |= i ? protocol.WILL_FLAG_MASK : 0, p |= u ? protocol.CLEAN_SESSION_MASK : 0, r.write(Buffer.from([p])), writeNumber(r, c), writeStringOrBuffer(r, f), i && (writeString(r, i.topic), writeStringOrBuffer(r, i.payload)), a && writeStringOrBuffer(r, a), s && writeStringOrBuffer(r, s), !0
			}

			function connack(e, r) {
				var t = (e || {}).returnCode;
				return "number" != typeof t ? (r.emit("error", new Error("Invalid return code")), !1) : (r.write(protocol.CONNACK_HEADER), writeLength(r, 2), r.write(e.sessionPresent ? protocol.SESSIONPRESENT_HEADER : zeroBuf), r.write(Buffer.from([t])))
			}

			function publish(e, r) {
				var t = e || {},
					n = t.qos || 0,
					o = t.retain ? protocol.RETAIN_MASK : 0,
					i = t.topic,
					u = t.payload || empty,
					c = t.messageId,
					f = 0;
				if ("string" == typeof i) f += Buffer.byteLength(i) + 2;
				else {
					if (!Buffer.isBuffer(i)) return r.emit("error", new Error("Invalid topic")), !1;
					f += i.length + 2
				}
				return Buffer.isBuffer(u) ? f += u.length : f += Buffer.byteLength(u), n && "number" != typeof c ? (r.emit("error", new Error("Invalid messageId")), !1) : (n && (f += 2), r.write(protocol.PUBLISH_HEADER[n][e.dup ? 1 : 0][o ? 1 : 0]), writeLength(r, f), writeNumber(r, byteLength(i)), r.write(i), n > 0 && writeNumber(r, c), r.write(u))
			}

			function confirmation(e, r) {
				var t = e || {},
					n = t.cmd || "puback",
					o = t.messageId,
					i = t.dup && "pubrel" === n ? protocol.DUP_MASK : 0,
					u = 0;
				return "pubrel" === n && (u = 1), "number" != typeof o ? (r.emit("error", new Error("Invalid messageId")), !1) : (r.write(protocol.ACKS[n][u][i][0]), writeLength(r, 2), writeNumber(r, o))
			}

			function subscribe(e, r) {
				var t = e || {},
					n = t.dup ? protocol.DUP_MASK : 0,
					o = t.messageId,
					i = t.subscriptions,
					u = 0;
				if ("number" != typeof o) return r.emit("error", new Error("Invalid messageId")), !1;
				if (u += 2, "object" != typeof i || !i.length) return r.emit("error", new Error("Invalid subscriptions")), !1;
				for (var c = 0; c < i.length; c += 1) {
					var f = i[c].topic,
						a = i[c].qos;
					if ("string" != typeof f) return r.emit("error", new Error("Invalid subscriptions - invalid topic")), !1;
					if ("number" != typeof a) return r.emit("error", new Error("Invalid subscriptions - invalid qos")), !1;
					u += Buffer.byteLength(f) + 2 + 1
				}
				r.write(protocol.SUBSCRIBE_HEADER[1][n ? 1 : 0][0]), writeLength(r, u), writeNumber(r, o);
				for (var s = !0, l = 0; l < i.length; l++) {
					var p = i[l],
						m = p.topic,
						w = p.qos;
					writeString(r, m), s = r.write(protocol.QOS[w])
				}
				return s
			}

			function suback(e, r) {
				var t = e || {},
					n = t.messageId,
					o = t.granted,
					i = 0;
				if ("number" != typeof n) return r.emit("error", new Error("Invalid messageId")), !1;
				if (i += 2, "object" != typeof o || !o.length) return r.emit("error", new Error("Invalid qos vector")), !1;
				for (var u = 0; u < o.length; u += 1) {
					if ("number" != typeof o[u]) return r.emit("error", new Error("Invalid qos vector")), !1;
					i += 1
				}
				return r.write(protocol.SUBACK_HEADER), writeLength(r, i), writeNumber(r, n), r.write(Buffer.from(o))
			}

			function unsubscribe(e, r) {
				var t = e || {},
					n = t.messageId,
					o = t.dup ? protocol.DUP_MASK : 0,
					i = t.unsubscriptions,
					u = 0;
				if ("number" != typeof n) return r.emit("error", new Error("Invalid messageId")), !1;
				if (u += 2, "object" != typeof i || !i.length) return r.emit("error", new Error("Invalid unsubscriptions")), !1;
				for (var c = 0; c < i.length; c += 1) {
					if ("string" != typeof i[c]) return r.emit("error", new Error("Invalid unsubscriptions")), !1;
					u += Buffer.byteLength(i[c]) + 2
				}
				r.write(protocol.UNSUBSCRIBE_HEADER[1][o ? 1 : 0][0]), writeLength(r, u), writeNumber(r, n);
				for (var f = !0, a = 0; a < i.length; a++) f = writeString(r, i[a]);
				return f
			}

			function emptyPacket(e, r) {
				return r.write(protocol.EMPTY[e.cmd])
			}

			function calcLengthLength(e) {
				return e >= 0 && e < 128 ? 1 : e >= 128 && e < 16384 ? 2 : e >= 16384 && e < 2097152 ? 3 : e >= 2097152 && e < 268435456 ? 4 : 0
			}

			function genBufLength(e) {
				var r = 0,
					t = 0,
					n = Buffer.allocUnsafe(calcLengthLength(e));
				do {
					r = e % 128 | 0, (e = e / 128 | 0) > 0 && (r |= 128), n.writeUInt8(r, t++, !0)
				} while (e > 0);
				return n
			}

			function writeLength(e, r) {
				var t = lengthCache[r];
				t || (t = genBufLength(r), r < 16384 && (lengthCache[r] = t)), e.write(t)
			}

			function writeString(e, r) {
				var t = Buffer.byteLength(r);
				writeNumber(e, t), e.write(r, "utf8")
			}

			function writeNumberCached(e, r) {
				return e.write(numCache[r])
			}

			function writeNumberGenerated(e, r) {
				return e.write(generateNumber(r))
			}

			function writeStringOrBuffer(e, r) {
				r && "string" == typeof r ? writeString(e, r) : r ? (writeNumber(e, r.length), e.write(r)) : writeNumber(e, 0)
			}

			function byteLength(e) {
				return e ? Buffer.isBuffer(e) ? e.length : Buffer.byteLength(e) : 0
			}
			var protocol = require("./constants"),
				Buffer = require("safe-buffer").Buffer,
				empty = Buffer.allocUnsafe(0),
				zeroBuf = Buffer.from([0]),
				numbers = require("./numbers"),
				nextTick = require("process-nextick-args"),
				numCache = numbers.cache,
				generateNumber = numbers.generateNumber,
				generateCache = numbers.generateCache,
				writeNumber = writeNumberCached,
				toGenerate = !0;
			Object.defineProperty(generate, "cacheNumbers", {
				get: function() {
					return writeNumber === writeNumberCached
				},
				set: function(e) {
					e ? (numCache && 0 !== Object.keys(numCache).length || (toGenerate = !0), writeNumber = writeNumberCached) : (toGenerate = !1, writeNumber = writeNumberGenerated)
				}
			});
			var lengthCache = {};
			module.exports = generate;

		}, {
			"./constants": 22,
			"./numbers": 25,
			"process-nextick-args": 30,
			"safe-buffer": 47
		}],
		29: [function(require, module, exports) {
			function once(e) {
				var r = function() {
					return r.called ? r.value : (r.called = !0, r.value = e.apply(this, arguments))
				};
				return r.called = !1, r
			}

			function onceStrict(e) {
				var r = function() {
						if (r.called) throw new Error(r.onceError);
						return r.called = !0, r.value = e.apply(this, arguments)
					},
					n = e.name || "Function wrapped with `once`";
				return r.onceError = n + " shouldn't be called more than once", r.called = !1, r
			}
			var wrappy = require("wrappy");
			module.exports = wrappy(once), module.exports.strict = wrappy(onceStrict), once.proto = once(function() {
				Object.defineProperty(Function.prototype, "once", {
					value: function() {
						return once(this)
					},
					configurable: !0
				}), Object.defineProperty(Function.prototype, "onceStrict", {
					value: function() {
						return onceStrict(this)
					},
					configurable: !0
				})
			});

		}, {
			"wrappy": 58
		}],
		30: [function(require, module, exports) {
			(function(process) {
				"use strict";

				function nextTick(e, n, c, r) {
					if ("function" != typeof e) throw new TypeError('"callback" argument must be a function');
					var s, t, o = arguments.length;
					switch (o) {
						case 0:
						case 1:
							return process.nextTick(e);
						case 2:
							return process.nextTick(function() {
								e.call(null, n)
							});
						case 3:
							return process.nextTick(function() {
								e.call(null, n, c)
							});
						case 4:
							return process.nextTick(function() {
								e.call(null, n, c, r)
							});
						default:
							for (s = new Array(o - 1), t = 0; t < s.length;) s[t++] = arguments[t];
							return process.nextTick(function() {
								e.apply(null, s)
							})
					}
				}!process.version || 0 === process.version.indexOf("v0.") || 0 === process.version.indexOf("v1.") && 0 !== process.version.indexOf("v1.8.") ? module.exports = nextTick : module.exports = process.nextTick;

			}).call(this, require('_process'))
		}, {
			"_process": 31
		}],
		31: [function(require, module, exports) {
			function defaultSetTimout() {
				throw new Error("setTimeout has not been defined")
			}

			function defaultClearTimeout() {
				throw new Error("clearTimeout has not been defined")
			}

			function runTimeout(e) {
				if (cachedSetTimeout === setTimeout) return setTimeout(e, 0);
				if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) return cachedSetTimeout = setTimeout, setTimeout(e, 0);
				try {
					return cachedSetTimeout(e, 0)
				} catch (t) {
					try {
						return cachedSetTimeout.call(null, e, 0)
					} catch (t) {
						return cachedSetTimeout.call(this, e, 0)
					}
				}
			}

			function runClearTimeout(e) {
				if (cachedClearTimeout === clearTimeout) return clearTimeout(e);
				if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) return cachedClearTimeout = clearTimeout, clearTimeout(e);
				try {
					return cachedClearTimeout(e)
				} catch (t) {
					try {
						return cachedClearTimeout.call(null, e)
					} catch (t) {
						return cachedClearTimeout.call(this, e)
					}
				}
			}

			function cleanUpNextTick() {
				draining && currentQueue && (draining = !1, currentQueue.length ? queue = currentQueue.concat(queue) : queueIndex = -1, queue.length && drainQueue())
			}

			function drainQueue() {
				if (!draining) {
					var e = runTimeout(cleanUpNextTick);
					draining = !0;
					for (var t = queue.length; t;) {
						for (currentQueue = queue, queue = []; ++queueIndex < t;) currentQueue && currentQueue[queueIndex].run();
						queueIndex = -1, t = queue.length
					}
					currentQueue = null, draining = !1, runClearTimeout(e)
				}
			}

			function Item(e, t) {
				this.fun = e, this.array = t
			}

			function noop() {}
			var process = module.exports = {},
				cachedSetTimeout, cachedClearTimeout;
			! function() {
				try {
					cachedSetTimeout = "function" == typeof setTimeout ? setTimeout : defaultSetTimout
				} catch (e) {
					cachedSetTimeout = defaultSetTimout
				}
				try {
					cachedClearTimeout = "function" == typeof clearTimeout ? clearTimeout : defaultClearTimeout
				} catch (e) {
					cachedClearTimeout = defaultClearTimeout
				}
			}();
			var queue = [],
				draining = !1,
				currentQueue, queueIndex = -1;
			process.nextTick = function(e) {
				var t = new Array(arguments.length - 1);
				if (arguments.length > 1)
					for (var r = 1; r < arguments.length; r++) t[r - 1] = arguments[r];
				queue.push(new Item(e, t)), 1 !== queue.length || draining || runTimeout(drainQueue)
			}, Item.prototype.run = function() {
				this.fun.apply(null, this.array)
			}, process.title = "browser", process.browser = !0, process.env = {}, process.argv = [], process.version = "", process.versions = {}, process.on = noop, process.addListener = noop, process.once = noop, process.off = noop, process.removeListener = noop, process.removeAllListeners = noop, process.emit = noop, process.prependListener = noop, process.prependOnceListener = noop, process.listeners = function(e) {
				return []
			}, process.binding = function(e) {
				throw new Error("process.binding is not supported")
			}, process.cwd = function() {
				return "/"
			}, process.chdir = function(e) {
				throw new Error("process.chdir is not supported")
			}, process.umask = function() {
				return 0
			};

		}, {}],
		32: [function(require, module, exports) {
			(function(global) {
				! function(e) {
					function o(e) {
						throw new RangeError(O[e])
					}

					function n(e, o) {
						for (var n = e.length, t = []; n--;) t[n] = o(e[n]);
						return t
					}

					function t(e, o) {
						var t = e.split("@"),
							r = "";
						return t.length > 1 && (r = t[0] + "@", e = t[1]), r + n((e = e.replace(F, ".")).split("."), o).join(".")
					}

					function r(e) {
						for (var o, n, t = [], r = 0, u = e.length; r < u;)(o = e.charCodeAt(r++)) >= 55296 && o <= 56319 && r < u ? 56320 == (64512 & (n = e.charCodeAt(r++))) ? t.push(((1023 & o) << 10) + (1023 & n) + 65536) : (t.push(o), r--) : t.push(o);
						return t
					}

					function u(e) {
						return n(e, function(e) {
							var o = "";
							return e > 65535 && (o += L((e -= 65536) >>> 10 & 1023 | 55296), e = 56320 | 1023 & e), o += L(e)
						}).join("")
					}

					function i(e) {
						return e - 48 < 10 ? e - 22 : e - 65 < 26 ? e - 65 : e - 97 < 26 ? e - 97 : w
					}

					function f(e, o) {
						return e + 22 + 75 * (e < 26) - ((0 != o) << 5)
					}

					function c(e, o, n) {
						var t = 0;
						for (e = n ? T(e / C) : e >> 1, e += T(e / o); e > S * b >> 1; t += w) e = T(e / S);
						return T(t + (S + 1) * e / (e + y))
					}

					function l(e) {
						var n, t, r, f, l, s, d, p, a, h, v = [],
							y = e.length,
							C = 0,
							I = j,
							E = m;
						for ((t = e.lastIndexOf(A)) < 0 && (t = 0), r = 0; r < t; ++r) e.charCodeAt(r) >= 128 && o("not-basic"), v.push(e.charCodeAt(r));
						for (f = t > 0 ? t + 1 : 0; f < y;) {
							for (l = C, s = 1, d = w; f >= y && o("invalid-input"), ((p = i(e.charCodeAt(f++))) >= w || p > T((g - C) / s)) && o("overflow"), C += p * s, a = d <= E ? x : d >= E + b ? b : d - E, !(p < a); d += w) s > T(g / (h = w - a)) && o("overflow"), s *= h;
							E = c(C - l, n = v.length + 1, 0 == l), T(C / n) > g - I && o("overflow"), I += T(C / n), C %= n, v.splice(C++, 0, I)
						}
						return u(v)
					}

					function s(e) {
						var n, t, u, i, l, s, d, p, a, h, v, y, C, I, E, F = [];
						for (y = (e = r(e)).length, n = j, t = 0, l = m, s = 0; s < y; ++s)(v = e[s]) < 128 && F.push(L(v));
						for (u = i = F.length, i && F.push(A); u < y;) {
							for (d = g, s = 0; s < y; ++s)(v = e[s]) >= n && v < d && (d = v);
							for (d - n > T((g - t) / (C = u + 1)) && o("overflow"), t += (d - n) * C, n = d, s = 0; s < y; ++s)
								if ((v = e[s]) < n && ++t > g && o("overflow"), v == n) {
									for (p = t, a = w; h = a <= l ? x : a >= l + b ? b : a - l, !(p < h); a += w) E = p - h, I = w - h, F.push(L(f(h + E % I, 0))), p = T(E / I);
									F.push(L(f(p, 0))), l = c(t, C, u == i), t = 0, ++u
								}++t, ++n
						}
						return F.join("")
					}
					var d = "object" == typeof exports && exports && !exports.nodeType && exports,
						p = "object" == typeof module && module && !module.nodeType && module,
						a = "object" == typeof global && global;
					a.global !== a && a.window !== a && a.self !== a || (e = a);
					var h, v, g = 2147483647,
						w = 36,
						x = 1,
						b = 26,
						y = 38,
						C = 700,
						m = 72,
						j = 128,
						A = "-",
						I = /^xn--/,
						E = /[^\x20-\x7E]/,
						F = /[\x2E\u3002\uFF0E\uFF61]/g,
						O = {
							overflow: "Overflow: input needs wider integers to process",
							"not-basic": "Illegal input >= 0x80 (not a basic code point)",
							"invalid-input": "Invalid input"
						},
						S = w - x,
						T = Math.floor,
						L = String.fromCharCode;
					if (h = {
							version: "1.4.1",
							ucs2: {
								decode: r,
								encode: u
							},
							decode: l,
							encode: s,
							toASCII: function(e) {
								return t(e, function(e) {
									return E.test(e) ? "xn--" + s(e) : e
								})
							},
							toUnicode: function(e) {
								return t(e, function(e) {
									return I.test(e) ? l(e.slice(4).toLowerCase()) : e
								})
							}
						}, "function" == typeof define && "object" == typeof define.amd && define.amd) define("punycode", function() {
						return h
					});
					else if (d && p)
						if (module.exports == d) p.exports = h;
						else
							for (v in h) h.hasOwnProperty(v) && (d[v] = h[v]);
					else e.punycode = h
				}(this);

			}).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
		}, {}],
		33: [function(require, module, exports) {
			"use strict";

			function hasOwnProperty(r, e) {
				return Object.prototype.hasOwnProperty.call(r, e)
			}
			module.exports = function(r, e, t, n) {
				e = e || "&", t = t || "=";
				var o = {};
				if ("string" != typeof r || 0 === r.length) return o;
				var a = /\+/g;
				r = r.split(e);
				var s = 1e3;
				n && "number" == typeof n.maxKeys && (s = n.maxKeys);
				var p = r.length;
				s > 0 && p > s && (p = s);
				for (var y = 0; y < p; ++y) {
					var u, c, i, l, f = r[y].replace(a, "%20"),
						v = f.indexOf(t);
					v >= 0 ? (u = f.substr(0, v), c = f.substr(v + 1)) : (u = f, c = ""), i = decodeURIComponent(u), l = decodeURIComponent(c), hasOwnProperty(o, i) ? isArray(o[i]) ? o[i].push(l) : o[i] = [o[i], l] : o[i] = l
				}
				return o
			};
			var isArray = Array.isArray || function(r) {
				return "[object Array]" === Object.prototype.toString.call(r)
			};

		}, {}],
		34: [function(require, module, exports) {
			"use strict";

			function map(r, e) {
				if (r.map) return r.map(e);
				for (var t = [], n = 0; n < r.length; n++) t.push(e(r[n], n));
				return t
			}
			var stringifyPrimitive = function(r) {
				switch (typeof r) {
					case "string":
						return r;
					case "boolean":
						return r ? "true" : "false";
					case "number":
						return isFinite(r) ? r : "";
					default:
						return ""
				}
			};
			module.exports = function(r, e, t, n) {
				return e = e || "&", t = t || "=", null === r && (r = void 0), "object" == typeof r ? map(objectKeys(r), function(n) {
					var i = encodeURIComponent(stringifyPrimitive(n)) + t;
					return isArray(r[n]) ? map(r[n], function(r) {
						return i + encodeURIComponent(stringifyPrimitive(r))
					}).join(e) : i + encodeURIComponent(stringifyPrimitive(r[n]))
				}).join(e) : n ? encodeURIComponent(stringifyPrimitive(n)) + t + encodeURIComponent(stringifyPrimitive(r)) : ""
			};
			var isArray = Array.isArray || function(r) {
					return "[object Array]" === Object.prototype.toString.call(r)
				},
				objectKeys = Object.keys || function(r) {
					var e = [];
					for (var t in r) Object.prototype.hasOwnProperty.call(r, t) && e.push(t);
					return e
				};

		}, {}],
		35: [function(require, module, exports) {
			"use strict";
			exports.decode = exports.parse = require("./decode"), exports.encode = exports.stringify = require("./encode");

		}, {
			"./decode": 33,
			"./encode": 34
		}],
		36: [function(require, module, exports) {
			module.exports = require("./lib/_stream_duplex.js");

		}, {
			"./lib/_stream_duplex.js": 37
		}],
		37: [function(require, module, exports) {
			"use strict";

			function Duplex(e) {
				if (!(this instanceof Duplex)) return new Duplex(e);
				Readable.call(this, e), Writable.call(this, e), e && !1 === e.readable && (this.readable = !1), e && !1 === e.writable && (this.writable = !1), this.allowHalfOpen = !0, e && !1 === e.allowHalfOpen && (this.allowHalfOpen = !1), this.once("end", onend)
			}

			function onend() {
				this.allowHalfOpen || this._writableState.ended || processNextTick(onEndNT, this)
			}

			function onEndNT(e) {
				e.end()
			}

			function forEach(e, t) {
				for (var r = 0, i = e.length; r < i; r++) t(e[r], r)
			}
			var processNextTick = require("process-nextick-args"),
				objectKeys = Object.keys || function(e) {
					var t = [];
					for (var r in e) t.push(r);
					return t
				};
			module.exports = Duplex;
			var util = require("core-util-is");
			util.inherits = require("inherits");
			var Readable = require("./_stream_readable"),
				Writable = require("./_stream_writable");
			util.inherits(Duplex, Readable);
			for (var keys = objectKeys(Writable.prototype), v = 0; v < keys.length; v++) {
				var method = keys[v];
				Duplex.prototype[method] || (Duplex.prototype[method] = Writable.prototype[method])
			}
			Object.defineProperty(Duplex.prototype, "destroyed", {
				get: function() {
					return void 0 !== this._readableState && void 0 !== this._writableState && (this._readableState.destroyed && this._writableState.destroyed)
				},
				set: function(e) {
					void 0 !== this._readableState && void 0 !== this._writableState && (this._readableState.destroyed = e, this._writableState.destroyed = e)
				}
			}), Duplex.prototype._destroy = function(e, t) {
				this.push(null), this.end(), processNextTick(t, e)
			};

		}, {
			"./_stream_readable": 39,
			"./_stream_writable": 41,
			"core-util-is": 12,
			"inherits": 19,
			"process-nextick-args": 30
		}],
		38: [function(require, module, exports) {
			"use strict";

			function PassThrough(r) {
				if (!(this instanceof PassThrough)) return new PassThrough(r);
				Transform.call(this, r)
			}
			module.exports = PassThrough;
			var Transform = require("./_stream_transform"),
				util = require("core-util-is");
			util.inherits = require("inherits"), util.inherits(PassThrough, Transform), PassThrough.prototype._transform = function(r, s, i) {
				i(null, r)
			};

		}, {
			"./_stream_transform": 40,
			"core-util-is": 12,
			"inherits": 19
		}],
		39: [function(require, module, exports) {
			(function(process, global) {
				"use strict";

				function _uint8ArrayToBuffer(e) {
					return Buffer.from(e)
				}

				function _isUint8Array(e) {
					return Buffer.isBuffer(e) || e instanceof OurUint8Array
				}

				function prependListener(e, t, r) {
					if ("function" == typeof e.prependListener) return e.prependListener(t, r);
					e._events && e._events[t] ? isArray(e._events[t]) ? e._events[t].unshift(r) : e._events[t] = [r, e._events[t]] : e.on(t, r)
				}

				function ReadableState(e, t) {
					Duplex = Duplex || require("./_stream_duplex"), e = e || {}, this.objectMode = !!e.objectMode, t instanceof Duplex && (this.objectMode = this.objectMode || !!e.readableObjectMode);
					var r = e.highWaterMark,
						n = this.objectMode ? 16 : 16384;
					this.highWaterMark = r || 0 === r ? r : n, this.highWaterMark = Math.floor(this.highWaterMark), this.buffer = new BufferList, this.length = 0, this.pipes = null, this.pipesCount = 0, this.flowing = null, this.ended = !1, this.endEmitted = !1, this.reading = !1, this.sync = !0, this.needReadable = !1, this.emittedReadable = !1, this.readableListening = !1, this.resumeScheduled = !1, this.destroyed = !1, this.defaultEncoding = e.defaultEncoding || "utf8", this.awaitDrain = 0, this.readingMore = !1, this.decoder = null, this.encoding = null, e.encoding && (StringDecoder || (StringDecoder = require("string_decoder/").StringDecoder), this.decoder = new StringDecoder(e.encoding), this.encoding = e.encoding)
				}

				function Readable(e) {
					if (Duplex = Duplex || require("./_stream_duplex"), !(this instanceof Readable)) return new Readable(e);
					this._readableState = new ReadableState(e, this), this.readable = !0, e && ("function" == typeof e.read && (this._read = e.read), "function" == typeof e.destroy && (this._destroy = e.destroy)), Stream.call(this)
				}

				function readableAddChunk(e, t, r, n, a) {
					var i = e._readableState;
					if (null === t) i.reading = !1, onEofChunk(e, i);
					else {
						var d;
						a || (d = chunkInvalid(i, t)), d ? e.emit("error", d) : i.objectMode || t && t.length > 0 ? ("string" == typeof t || i.objectMode || Object.getPrototypeOf(t) === Buffer.prototype || (t = _uint8ArrayToBuffer(t)), n ? i.endEmitted ? e.emit("error", new Error("stream.unshift() after end event")) : addChunk(e, i, t, !0) : i.ended ? e.emit("error", new Error("stream.push() after EOF")) : (i.reading = !1, i.decoder && !r ? (t = i.decoder.write(t), i.objectMode || 0 !== t.length ? addChunk(e, i, t, !1) : maybeReadMore(e, i)) : addChunk(e, i, t, !1))) : n || (i.reading = !1)
					}
					return needMoreData(i)
				}

				function addChunk(e, t, r, n) {
					t.flowing && 0 === t.length && !t.sync ? (e.emit("data", r), e.read(0)) : (t.length += t.objectMode ? 1 : r.length, n ? t.buffer.unshift(r) : t.buffer.push(r), t.needReadable && emitReadable(e)), maybeReadMore(e, t)
				}

				function chunkInvalid(e, t) {
					var r;
					return _isUint8Array(t) || "string" == typeof t || void 0 === t || e.objectMode || (r = new TypeError("Invalid non-string/buffer chunk")), r
				}

				function needMoreData(e) {
					return !e.ended && (e.needReadable || e.length < e.highWaterMark || 0 === e.length)
				}

				function computeNewHighWaterMark(e) {
					return e >= MAX_HWM ? e = MAX_HWM : (e--, e |= e >>> 1, e |= e >>> 2, e |= e >>> 4, e |= e >>> 8, e |= e >>> 16, e++), e
				}

				function howMuchToRead(e, t) {
					return e <= 0 || 0 === t.length && t.ended ? 0 : t.objectMode ? 1 : e !== e ? t.flowing && t.length ? t.buffer.head.data.length : t.length : (e > t.highWaterMark && (t.highWaterMark = computeNewHighWaterMark(e)), e <= t.length ? e : t.ended ? t.length : (t.needReadable = !0, 0))
				}

				function onEofChunk(e, t) {
					if (!t.ended) {
						if (t.decoder) {
							var r = t.decoder.end();
							r && r.length && (t.buffer.push(r), t.length += t.objectMode ? 1 : r.length)
						}
						t.ended = !0, emitReadable(e)
					}
				}

				function emitReadable(e) {
					var t = e._readableState;
					t.needReadable = !1, t.emittedReadable || (debug("emitReadable", t.flowing), t.emittedReadable = !0, t.sync ? processNextTick(emitReadable_, e) : emitReadable_(e))
				}

				function emitReadable_(e) {
					debug("emit readable"), e.emit("readable"), flow(e)
				}

				function maybeReadMore(e, t) {
					t.readingMore || (t.readingMore = !0, processNextTick(maybeReadMore_, e, t))
				}

				function maybeReadMore_(e, t) {
					for (var r = t.length; !t.reading && !t.flowing && !t.ended && t.length < t.highWaterMark && (debug("maybeReadMore read 0"), e.read(0), r !== t.length);) r = t.length;
					t.readingMore = !1
				}

				function pipeOnDrain(e) {
					return function() {
						var t = e._readableState;
						debug("pipeOnDrain", t.awaitDrain), t.awaitDrain && t.awaitDrain--, 0 === t.awaitDrain && EElistenerCount(e, "data") && (t.flowing = !0, flow(e))
					}
				}

				function nReadingNextTick(e) {
					debug("readable nexttick read 0"), e.read(0)
				}

				function resume(e, t) {
					t.resumeScheduled || (t.resumeScheduled = !0, processNextTick(resume_, e, t))
				}

				function resume_(e, t) {
					t.reading || (debug("resume read 0"), e.read(0)), t.resumeScheduled = !1, t.awaitDrain = 0, e.emit("resume"), flow(e), t.flowing && !t.reading && e.read(0)
				}

				function flow(e) {
					var t = e._readableState;
					for (debug("flow", t.flowing); t.flowing && null !== e.read(););
				}

				function fromList(e, t) {
					if (0 === t.length) return null;
					var r;
					return t.objectMode ? r = t.buffer.shift() : !e || e >= t.length ? (r = t.decoder ? t.buffer.join("") : 1 === t.buffer.length ? t.buffer.head.data : t.buffer.concat(t.length), t.buffer.clear()) : r = fromListPartial(e, t.buffer, t.decoder), r
				}

				function fromListPartial(e, t, r) {
					var n;
					return e < t.head.data.length ? (n = t.head.data.slice(0, e), t.head.data = t.head.data.slice(e)) : n = e === t.head.data.length ? t.shift() : r ? copyFromBufferString(e, t) : copyFromBuffer(e, t), n
				}

				function copyFromBufferString(e, t) {
					var r = t.head,
						n = 1,
						a = r.data;
					for (e -= a.length; r = r.next;) {
						var i = r.data,
							d = e > i.length ? i.length : e;
						if (d === i.length ? a += i : a += i.slice(0, e), 0 === (e -= d)) {
							d === i.length ? (++n, r.next ? t.head = r.next : t.head = t.tail = null) : (t.head = r, r.data = i.slice(d));
							break
						}++n
					}
					return t.length -= n, a
				}

				function copyFromBuffer(e, t) {
					var r = Buffer.allocUnsafe(e),
						n = t.head,
						a = 1;
					for (n.data.copy(r), e -= n.data.length; n = n.next;) {
						var i = n.data,
							d = e > i.length ? i.length : e;
						if (i.copy(r, r.length - e, 0, d), 0 === (e -= d)) {
							d === i.length ? (++a, n.next ? t.head = n.next : t.head = t.tail = null) : (t.head = n, n.data = i.slice(d));
							break
						}++a
					}
					return t.length -= a, r
				}

				function endReadable(e) {
					var t = e._readableState;
					if (t.length > 0) throw new Error('"endReadable()" called on non-empty stream');
					t.endEmitted || (t.ended = !0, processNextTick(endReadableNT, t, e))
				}

				function endReadableNT(e, t) {
					e.endEmitted || 0 !== e.length || (e.endEmitted = !0, t.readable = !1, t.emit("end"))
				}

				function forEach(e, t) {
					for (var r = 0, n = e.length; r < n; r++) t(e[r], r)
				}

				function indexOf(e, t) {
					for (var r = 0, n = e.length; r < n; r++)
						if (e[r] === t) return r;
					return -1
				}
				var processNextTick = require("process-nextick-args");
				module.exports = Readable;
				var isArray = require("isarray"),
					Duplex;
				Readable.ReadableState = ReadableState;
				var EE = require("events").EventEmitter,
					EElistenerCount = function(e, t) {
						return e.listeners(t).length
					},
					Stream = require("./internal/streams/stream"),
					Buffer = require("safe-buffer").Buffer,
					OurUint8Array = global.Uint8Array || function() {},
					util = require("core-util-is");
				util.inherits = require("inherits");
				var debugUtil = require("util"),
					debug = void 0;
				debug = debugUtil && debugUtil.debuglog ? debugUtil.debuglog("stream") : function() {};
				var BufferList = require("./internal/streams/BufferList"),
					destroyImpl = require("./internal/streams/destroy"),
					StringDecoder;
				util.inherits(Readable, Stream);
				var kProxyEvents = ["error", "close", "destroy", "pause", "resume"];
				Object.defineProperty(Readable.prototype, "destroyed", {
					get: function() {
						return void 0 !== this._readableState && this._readableState.destroyed
					},
					set: function(e) {
						this._readableState && (this._readableState.destroyed = e)
					}
				}), Readable.prototype.destroy = destroyImpl.destroy, Readable.prototype._undestroy = destroyImpl.undestroy, Readable.prototype._destroy = function(e, t) {
					this.push(null), t(e)
				}, Readable.prototype.push = function(e, t) {
					var r, n = this._readableState;
					return n.objectMode ? r = !0 : "string" == typeof e && ((t = t || n.defaultEncoding) !== n.encoding && (e = Buffer.from(e, t), t = ""), r = !0), readableAddChunk(this, e, t, !1, r)
				}, Readable.prototype.unshift = function(e) {
					return readableAddChunk(this, e, null, !0, !1)
				}, Readable.prototype.isPaused = function() {
					return !1 === this._readableState.flowing
				}, Readable.prototype.setEncoding = function(e) {
					return StringDecoder || (StringDecoder = require("string_decoder/").StringDecoder), this._readableState.decoder = new StringDecoder(e), this._readableState.encoding = e, this
				};
				var MAX_HWM = 8388608;
				Readable.prototype.read = function(e) {
					debug("read", e), e = parseInt(e, 10);
					var t = this._readableState,
						r = e;
					if (0 !== e && (t.emittedReadable = !1), 0 === e && t.needReadable && (t.length >= t.highWaterMark || t.ended)) return debug("read: emitReadable", t.length, t.ended), 0 === t.length && t.ended ? endReadable(this) : emitReadable(this), null;
					if (0 === (e = howMuchToRead(e, t)) && t.ended) return 0 === t.length && endReadable(this), null;
					var n = t.needReadable;
					debug("need readable", n), (0 === t.length || t.length - e < t.highWaterMark) && debug("length less than watermark", n = !0), t.ended || t.reading ? debug("reading or ended", n = !1) : n && (debug("do read"), t.reading = !0, t.sync = !0, 0 === t.length && (t.needReadable = !0), this._read(t.highWaterMark), t.sync = !1, t.reading || (e = howMuchToRead(r, t)));
					var a;
					return null === (a = e > 0 ? fromList(e, t) : null) ? (t.needReadable = !0, e = 0) : t.length -= e, 0 === t.length && (t.ended || (t.needReadable = !0), r !== e && t.ended && endReadable(this)), null !== a && this.emit("data", a), a
				}, Readable.prototype._read = function(e) {
					this.emit("error", new Error("_read() is not implemented"))
				}, Readable.prototype.pipe = function(e, t) {
					function r(e, t) {
						debug("onunpipe"), e === l && t && !1 === t.hasUnpiped && (t.hasUnpiped = !0, a())
					}

					function n() {
						debug("onend"), e.end()
					}

					function a() {
						debug("cleanup"), e.removeListener("close", o), e.removeListener("finish", u), e.removeListener("drain", p), e.removeListener("error", d), e.removeListener("unpipe", r), l.removeListener("end", n), l.removeListener("end", s), l.removeListener("data", i), c = !0, !h.awaitDrain || e._writableState && !e._writableState.needDrain || p()
					}

					function i(t) {
						debug("ondata"), b = !1, !1 !== e.write(t) || b || ((1 === h.pipesCount && h.pipes === e || h.pipesCount > 1 && -1 !== indexOf(h.pipes, e)) && !c && (debug("false write response, pause", l._readableState.awaitDrain), l._readableState.awaitDrain++, b = !0), l.pause())
					}

					function d(t) {
						debug("onerror", t), s(), e.removeListener("error", d), 0 === EElistenerCount(e, "error") && e.emit("error", t)
					}

					function o() {
						e.removeListener("finish", u), s()
					}

					function u() {
						debug("onfinish"), e.removeListener("close", o), s()
					}

					function s() {
						debug("unpipe"), l.unpipe(e)
					}
					var l = this,
						h = this._readableState;
					switch (h.pipesCount) {
						case 0:
							h.pipes = e;
							break;
						case 1:
							h.pipes = [h.pipes, e];
							break;
						default:
							h.pipes.push(e)
					}
					h.pipesCount += 1, debug("pipe count=%d opts=%j", h.pipesCount, t);
					var f = (!t || !1 !== t.end) && e !== process.stdout && e !== process.stderr ? n : s;
					h.endEmitted ? processNextTick(f) : l.once("end", f), e.on("unpipe", r);
					var p = pipeOnDrain(l);
					e.on("drain", p);
					var c = !1,
						b = !1;
					return l.on("data", i), prependListener(e, "error", d), e.once("close", o), e.once("finish", u), e.emit("pipe", l), h.flowing || (debug("pipe resume"), l.resume()), e
				}, Readable.prototype.unpipe = function(e) {
					var t = this._readableState,
						r = {
							hasUnpiped: !1
						};
					if (0 === t.pipesCount) return this;
					if (1 === t.pipesCount) return e && e !== t.pipes ? this : (e || (e = t.pipes), t.pipes = null, t.pipesCount = 0, t.flowing = !1, e && e.emit("unpipe", this, r), this);
					if (!e) {
						var n = t.pipes,
							a = t.pipesCount;
						t.pipes = null, t.pipesCount = 0, t.flowing = !1;
						for (var i = 0; i < a; i++) n[i].emit("unpipe", this, r);
						return this
					}
					var d = indexOf(t.pipes, e);
					return -1 === d ? this : (t.pipes.splice(d, 1), t.pipesCount -= 1, 1 === t.pipesCount && (t.pipes = t.pipes[0]), e.emit("unpipe", this, r), this)
				}, Readable.prototype.on = function(e, t) {
					var r = Stream.prototype.on.call(this, e, t);
					if ("data" === e) !1 !== this._readableState.flowing && this.resume();
					else if ("readable" === e) {
						var n = this._readableState;
						n.endEmitted || n.readableListening || (n.readableListening = n.needReadable = !0, n.emittedReadable = !1, n.reading ? n.length && emitReadable(this) : processNextTick(nReadingNextTick, this))
					}
					return r
				}, Readable.prototype.addListener = Readable.prototype.on, Readable.prototype.resume = function() {
					var e = this._readableState;
					return e.flowing || (debug("resume"), e.flowing = !0, resume(this, e)), this
				}, Readable.prototype.pause = function() {
					return debug("call pause flowing=%j", this._readableState.flowing), !1 !== this._readableState.flowing && (debug("pause"), this._readableState.flowing = !1, this.emit("pause")), this
				}, Readable.prototype.wrap = function(e) {
					var t = this._readableState,
						r = !1,
						n = this;
					e.on("end", function() {
						if (debug("wrapped end"), t.decoder && !t.ended) {
							var e = t.decoder.end();
							e && e.length && n.push(e)
						}
						n.push(null)
					}), e.on("data", function(a) {
						debug("wrapped data"), t.decoder && (a = t.decoder.write(a)), (!t.objectMode || null !== a && void 0 !== a) && (t.objectMode || a && a.length) && (n.push(a) || (r = !0, e.pause()))
					});
					for (var a in e) void 0 === this[a] && "function" == typeof e[a] && (this[a] = function(t) {
						return function() {
							return e[t].apply(e, arguments)
						}
					}(a));
					for (var i = 0; i < kProxyEvents.length; i++) e.on(kProxyEvents[i], n.emit.bind(n, kProxyEvents[i]));
					return n._read = function(t) {
						debug("wrapped _read", t), r && (r = !1, e.resume())
					}, n
				}, Readable._fromList = fromList;

			}).call(this, require('_process'), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
		}, {
			"./_stream_duplex": 37,
			"./internal/streams/BufferList": 42,
			"./internal/streams/destroy": 43,
			"./internal/streams/stream": 44,
			"_process": 31,
			"core-util-is": 12,
			"events": 17,
			"inherits": 19,
			"isarray": 21,
			"process-nextick-args": 30,
			"safe-buffer": 47,
			"string_decoder/": 49,
			"util": 10
		}],
		40: [function(require, module, exports) {
			"use strict";

			function TransformState(r) {
				this.afterTransform = function(t, n) {
					return afterTransform(r, t, n)
				}, this.needTransform = !1, this.transforming = !1, this.writecb = null, this.writechunk = null, this.writeencoding = null
			}

			function afterTransform(r, t, n) {
				var e = r._transformState;
				e.transforming = !1;
				var i = e.writecb;
				if (!i) return r.emit("error", new Error("write callback called multiple times"));
				e.writechunk = null, e.writecb = null, null !== n && void 0 !== n && r.push(n), i(t);
				var a = r._readableState;
				a.reading = !1, (a.needReadable || a.length < a.highWaterMark) && r._read(a.highWaterMark)
			}

			function Transform(r) {
				if (!(this instanceof Transform)) return new Transform(r);
				Duplex.call(this, r), this._transformState = new TransformState(this);
				var t = this;
				this._readableState.needReadable = !0, this._readableState.sync = !1, r && ("function" == typeof r.transform && (this._transform = r.transform), "function" == typeof r.flush && (this._flush = r.flush)), this.once("prefinish", function() {
					"function" == typeof this._flush ? this._flush(function(r, n) {
						done(t, r, n)
					}) : done(t)
				})
			}

			function done(r, t, n) {
				if (t) return r.emit("error", t);
				null !== n && void 0 !== n && r.push(n);
				var e = r._writableState,
					i = r._transformState;
				if (e.length) throw new Error("Calling transform done when ws.length != 0");
				if (i.transforming) throw new Error("Calling transform done when still transforming");
				return r.push(null)
			}
			module.exports = Transform;
			var Duplex = require("./_stream_duplex"),
				util = require("core-util-is");
			util.inherits = require("inherits"), util.inherits(Transform, Duplex), Transform.prototype.push = function(r, t) {
				return this._transformState.needTransform = !1, Duplex.prototype.push.call(this, r, t)
			}, Transform.prototype._transform = function(r, t, n) {
				throw new Error("_transform() is not implemented")
			}, Transform.prototype._write = function(r, t, n) {
				var e = this._transformState;
				if (e.writecb = n, e.writechunk = r, e.writeencoding = t, !e.transforming) {
					var i = this._readableState;
					(e.needTransform || i.needReadable || i.length < i.highWaterMark) && this._read(i.highWaterMark)
				}
			}, Transform.prototype._read = function(r) {
				var t = this._transformState;
				null !== t.writechunk && t.writecb && !t.transforming ? (t.transforming = !0, this._transform(t.writechunk, t.writeencoding, t.afterTransform)) : t.needTransform = !0
			}, Transform.prototype._destroy = function(r, t) {
				var n = this;
				Duplex.prototype._destroy.call(this, r, function(r) {
					t(r), n.emit("close")
				})
			};

		}, {
			"./_stream_duplex": 37,
			"core-util-is": 12,
			"inherits": 19
		}],
		41: [function(require, module, exports) {
			(function(process, global) {
				"use strict";

				function WriteReq(e, t, r) {
					this.chunk = e, this.encoding = t, this.callback = r, this.next = null
				}

				function CorkedRequest(e) {
					var t = this;
					this.next = null, this.entry = null, this.finish = function() {
						onCorkedFinish(t, e)
					}
				}

				function _uint8ArrayToBuffer(e) {
					return Buffer.from(e)
				}

				function _isUint8Array(e) {
					return Buffer.isBuffer(e) || e instanceof OurUint8Array
				}

				function nop() {}

				function WritableState(e, t) {
					Duplex = Duplex || require("./_stream_duplex"), e = e || {}, this.objectMode = !!e.objectMode, t instanceof Duplex && (this.objectMode = this.objectMode || !!e.writableObjectMode);
					var r = e.highWaterMark,
						i = this.objectMode ? 16 : 16384;
					this.highWaterMark = r || 0 === r ? r : i, this.highWaterMark = Math.floor(this.highWaterMark), this.finalCalled = !1, this.needDrain = !1, this.ending = !1, this.ended = !1, this.finished = !1, this.destroyed = !1;
					var n = !1 === e.decodeStrings;
					this.decodeStrings = !n, this.defaultEncoding = e.defaultEncoding || "utf8", this.length = 0, this.writing = !1, this.corked = 0, this.sync = !0, this.bufferProcessing = !1, this.onwrite = function(e) {
						onwrite(t, e)
					}, this.writecb = null, this.writelen = 0, this.bufferedRequest = null, this.lastBufferedRequest = null, this.pendingcb = 0, this.prefinished = !1, this.errorEmitted = !1, this.bufferedRequestCount = 0, this.corkedRequestsFree = new CorkedRequest(this)
				}

				function Writable(e) {
					if (Duplex = Duplex || require("./_stream_duplex"), !(realHasInstance.call(Writable, this) || this instanceof Duplex)) return new Writable(e);
					this._writableState = new WritableState(e, this), this.writable = !0, e && ("function" == typeof e.write && (this._write = e.write), "function" == typeof e.writev && (this._writev = e.writev), "function" == typeof e.destroy && (this._destroy = e.destroy), "function" == typeof e.final && (this._final = e.final)), Stream.call(this)
				}

				function writeAfterEnd(e, t) {
					var r = new Error("write after end");
					e.emit("error", r), processNextTick(t, r)
				}

				function validChunk(e, t, r, i) {
					var n = !0,
						o = !1;
					return null === r ? o = new TypeError("May not write null values to stream") : "string" == typeof r || void 0 === r || t.objectMode || (o = new TypeError("Invalid non-string/buffer chunk")), o && (e.emit("error", o), processNextTick(i, o), n = !1), n
				}

				function decodeChunk(e, t, r) {
					return e.objectMode || !1 === e.decodeStrings || "string" != typeof t || (t = Buffer.from(t, r)), t
				}

				function writeOrBuffer(e, t, r, i, n, o) {
					if (!r) {
						var s = decodeChunk(t, i, n);
						i !== s && (r = !0, n = "buffer", i = s)
					}
					var a = t.objectMode ? 1 : i.length;
					t.length += a;
					var f = t.length < t.highWaterMark;
					if (f || (t.needDrain = !0), t.writing || t.corked) {
						var u = t.lastBufferedRequest;
						t.lastBufferedRequest = {
							chunk: i,
							encoding: n,
							isBuf: r,
							callback: o,
							next: null
						}, u ? u.next = t.lastBufferedRequest : t.bufferedRequest = t.lastBufferedRequest, t.bufferedRequestCount += 1
					} else doWrite(e, t, !1, a, i, n, o);
					return f
				}

				function doWrite(e, t, r, i, n, o, s) {
					t.writelen = i, t.writecb = s, t.writing = !0, t.sync = !0, r ? e._writev(n, t.onwrite) : e._write(n, o, t.onwrite), t.sync = !1
				}

				function onwriteError(e, t, r, i, n) {
					--t.pendingcb, r ? (processNextTick(n, i), processNextTick(finishMaybe, e, t), e._writableState.errorEmitted = !0, e.emit("error", i)) : (n(i), e._writableState.errorEmitted = !0, e.emit("error", i), finishMaybe(e, t))
				}

				function onwriteStateUpdate(e) {
					e.writing = !1, e.writecb = null, e.length -= e.writelen, e.writelen = 0
				}

				function onwrite(e, t) {
					var r = e._writableState,
						i = r.sync,
						n = r.writecb;
					if (onwriteStateUpdate(r), t) onwriteError(e, r, i, t, n);
					else {
						var o = needFinish(r);
						o || r.corked || r.bufferProcessing || !r.bufferedRequest || clearBuffer(e, r), i ? asyncWrite(afterWrite, e, r, o, n) : afterWrite(e, r, o, n)
					}
				}

				function afterWrite(e, t, r, i) {
					r || onwriteDrain(e, t), t.pendingcb--, i(), finishMaybe(e, t)
				}

				function onwriteDrain(e, t) {
					0 === t.length && t.needDrain && (t.needDrain = !1, e.emit("drain"))
				}

				function clearBuffer(e, t) {
					t.bufferProcessing = !0;
					var r = t.bufferedRequest;
					if (e._writev && r && r.next) {
						var i = t.bufferedRequestCount,
							n = new Array(i),
							o = t.corkedRequestsFree;
						o.entry = r;
						for (var s = 0, a = !0; r;) n[s] = r, r.isBuf || (a = !1), r = r.next, s += 1;
						n.allBuffers = a, doWrite(e, t, !0, t.length, n, "", o.finish), t.pendingcb++, t.lastBufferedRequest = null, o.next ? (t.corkedRequestsFree = o.next, o.next = null) : t.corkedRequestsFree = new CorkedRequest(t)
					} else {
						for (; r;) {
							var f = r.chunk,
								u = r.encoding,
								l = r.callback;
							if (doWrite(e, t, !1, t.objectMode ? 1 : f.length, f, u, l), r = r.next, t.writing) break
						}
						null === r && (t.lastBufferedRequest = null)
					}
					t.bufferedRequestCount = 0, t.bufferedRequest = r, t.bufferProcessing = !1
				}

				function needFinish(e) {
					return e.ending && 0 === e.length && null === e.bufferedRequest && !e.finished && !e.writing
				}

				function callFinal(e, t) {
					e._final(function(r) {
						t.pendingcb--, r && e.emit("error", r), t.prefinished = !0, e.emit("prefinish"), finishMaybe(e, t)
					})
				}

				function prefinish(e, t) {
					t.prefinished || t.finalCalled || ("function" == typeof e._final ? (t.pendingcb++, t.finalCalled = !0, processNextTick(callFinal, e, t)) : (t.prefinished = !0, e.emit("prefinish")))
				}

				function finishMaybe(e, t) {
					var r = needFinish(t);
					return r && (prefinish(e, t), 0 === t.pendingcb && (t.finished = !0, e.emit("finish"))), r
				}

				function endWritable(e, t, r) {
					t.ending = !0, finishMaybe(e, t), r && (t.finished ? processNextTick(r) : e.once("finish", r)), t.ended = !0, e.writable = !1
				}

				function onCorkedFinish(e, t, r) {
					var i = e.entry;
					for (e.entry = null; i;) {
						var n = i.callback;
						t.pendingcb--, n(r), i = i.next
					}
					t.corkedRequestsFree ? t.corkedRequestsFree.next = e : t.corkedRequestsFree = e
				}
				var processNextTick = require("process-nextick-args");
				module.exports = Writable;
				var asyncWrite = !process.browser && ["v0.10", "v0.9."].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick,
					Duplex;
				Writable.WritableState = WritableState;
				var util = require("core-util-is");
				util.inherits = require("inherits");
				var internalUtil = {
						deprecate: require("util-deprecate")
					},
					Stream = require("./internal/streams/stream"),
					Buffer = require("safe-buffer").Buffer,
					OurUint8Array = global.Uint8Array || function() {},
					destroyImpl = require("./internal/streams/destroy");
				util.inherits(Writable, Stream), WritableState.prototype.getBuffer = function() {
						for (var e = this.bufferedRequest, t = []; e;) t.push(e), e = e.next;
						return t
					},
					function() {
						try {
							Object.defineProperty(WritableState.prototype, "buffer", {
								get: internalUtil.deprecate(function() {
									return this.getBuffer()
								}, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
							})
						} catch (e) {}
					}();
				var realHasInstance;
				"function" == typeof Symbol && Symbol.hasInstance && "function" == typeof Function.prototype[Symbol.hasInstance] ? (realHasInstance = Function.prototype[Symbol.hasInstance], Object.defineProperty(Writable, Symbol.hasInstance, {
					value: function(e) {
						return !!realHasInstance.call(this, e) || e && e._writableState instanceof WritableState
					}
				})) : realHasInstance = function(e) {
					return e instanceof this
				}, Writable.prototype.pipe = function() {
					this.emit("error", new Error("Cannot pipe, not readable"))
				}, Writable.prototype.write = function(e, t, r) {
					var i = this._writableState,
						n = !1,
						o = _isUint8Array(e) && !i.objectMode;
					return o && !Buffer.isBuffer(e) && (e = _uint8ArrayToBuffer(e)), "function" == typeof t && (r = t, t = null), o ? t = "buffer" : t || (t = i.defaultEncoding), "function" != typeof r && (r = nop), i.ended ? writeAfterEnd(this, r) : (o || validChunk(this, i, e, r)) && (i.pendingcb++, n = writeOrBuffer(this, i, o, e, t, r)), n
				}, Writable.prototype.cork = function() {
					this._writableState.corked++
				}, Writable.prototype.uncork = function() {
					var e = this._writableState;
					e.corked && (e.corked--, e.writing || e.corked || e.finished || e.bufferProcessing || !e.bufferedRequest || clearBuffer(this, e))
				}, Writable.prototype.setDefaultEncoding = function(e) {
					if ("string" == typeof e && (e = e.toLowerCase()), !(["hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw"].indexOf((e + "").toLowerCase()) > -1)) throw new TypeError("Unknown encoding: " + e);
					return this._writableState.defaultEncoding = e, this
				}, Writable.prototype._write = function(e, t, r) {
					r(new Error("_write() is not implemented"))
				}, Writable.prototype._writev = null, Writable.prototype.end = function(e, t, r) {
					var i = this._writableState;
					"function" == typeof e ? (r = e, e = null, t = null) : "function" == typeof t && (r = t, t = null), null !== e && void 0 !== e && this.write(e, t), i.corked && (i.corked = 1, this.uncork()), i.ending || i.finished || endWritable(this, i, r)
				}, Object.defineProperty(Writable.prototype, "destroyed", {
					get: function() {
						return void 0 !== this._writableState && this._writableState.destroyed
					},
					set: function(e) {
						this._writableState && (this._writableState.destroyed = e)
					}
				}), Writable.prototype.destroy = destroyImpl.destroy, Writable.prototype._undestroy = destroyImpl.undestroy, Writable.prototype._destroy = function(e, t) {
					this.end(), t(e)
				};

			}).call(this, require('_process'), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
		}, {
			"./_stream_duplex": 37,
			"./internal/streams/destroy": 43,
			"./internal/streams/stream": 44,
			"_process": 31,
			"core-util-is": 12,
			"inherits": 19,
			"process-nextick-args": 30,
			"safe-buffer": 47,
			"util-deprecate": 52
		}],
		42: [function(require, module, exports) {
			"use strict";

			function _classCallCheck(t, e) {
				if (!(t instanceof e)) throw new TypeError("Cannot call a class as a function")
			}

			function copyBuffer(t, e, h) {
				t.copy(e, h)
			}
			var Buffer = require("safe-buffer").Buffer;
			module.exports = function() {
				function t() {
					_classCallCheck(this, t), this.head = null, this.tail = null, this.length = 0
				}
				return t.prototype.push = function(t) {
					var e = {
						data: t,
						next: null
					};
					this.length > 0 ? this.tail.next = e : this.head = e, this.tail = e, ++this.length
				}, t.prototype.unshift = function(t) {
					var e = {
						data: t,
						next: this.head
					};
					0 === this.length && (this.tail = e), this.head = e, ++this.length
				}, t.prototype.shift = function() {
					if (0 !== this.length) {
						var t = this.head.data;
						return 1 === this.length ? this.head = this.tail = null : this.head = this.head.next, --this.length, t
					}
				}, t.prototype.clear = function() {
					this.head = this.tail = null, this.length = 0
				}, t.prototype.join = function(t) {
					if (0 === this.length) return "";
					for (var e = this.head, h = "" + e.data; e = e.next;) h += t + e.data;
					return h
				}, t.prototype.concat = function(t) {
					if (0 === this.length) return Buffer.alloc(0);
					if (1 === this.length) return this.head.data;
					for (var e = Buffer.allocUnsafe(t >>> 0), h = this.head, n = 0; h;) copyBuffer(h.data, e, n), n += h.data.length, h = h.next;
					return e
				}, t
			}();

		}, {
			"safe-buffer": 47
		}],
		43: [function(require, module, exports) {
			"use strict";

			function destroy(t, e) {
				var r = this,
					i = this._readableState && this._readableState.destroyed,
					a = this._writableState && this._writableState.destroyed;
				i || a ? e ? e(t) : !t || this._writableState && this._writableState.errorEmitted || processNextTick(emitErrorNT, this, t) : (this._readableState && (this._readableState.destroyed = !0), this._writableState && (this._writableState.destroyed = !0), this._destroy(t || null, function(t) {
					!e && t ? (processNextTick(emitErrorNT, r, t), r._writableState && (r._writableState.errorEmitted = !0)) : e && e(t)
				}))
			}

			function undestroy() {
				this._readableState && (this._readableState.destroyed = !1, this._readableState.reading = !1, this._readableState.ended = !1, this._readableState.endEmitted = !1), this._writableState && (this._writableState.destroyed = !1, this._writableState.ended = !1, this._writableState.ending = !1, this._writableState.finished = !1, this._writableState.errorEmitted = !1)
			}

			function emitErrorNT(t, e) {
				t.emit("error", e)
			}
			var processNextTick = require("process-nextick-args");
			module.exports = {
				destroy: destroy,
				undestroy: undestroy
			};

		}, {
			"process-nextick-args": 30
		}],
		44: [function(require, module, exports) {
			module.exports = require("events").EventEmitter;

		}, {
			"events": 17
		}],
		45: [function(require, module, exports) {
			exports = module.exports = require("./lib/_stream_readable.js"), exports.Stream = exports, exports.Readable = exports, exports.Writable = require("./lib/_stream_writable.js"), exports.Duplex = require("./lib/_stream_duplex.js"), exports.Transform = require("./lib/_stream_transform.js"), exports.PassThrough = require("./lib/_stream_passthrough.js");

		}, {
			"./lib/_stream_duplex.js": 37,
			"./lib/_stream_passthrough.js": 38,
			"./lib/_stream_readable.js": 39,
			"./lib/_stream_transform.js": 40,
			"./lib/_stream_writable.js": 41
		}],
		46: [function(require, module, exports) {
			"use strict";

			function ReInterval(e, r, t) {
				var n = this;
				this._callback = e, this._args = t, this._interval = setInterval(e, r, this._args), this.reschedule = function(e) {
					e || (e = n._interval), n._interval && clearInterval(n._interval), n._interval = setInterval(n._callback, e, n._args)
				}, this.clear = function() {
					n._interval && (clearInterval(n._interval), n._interval = void 0)
				}, this.destroy = function() {
					n._interval && clearInterval(n._interval), n._callback = void 0, n._interval = void 0, n._args = void 0
				}
			}

			function reInterval() {
				if ("function" != typeof arguments[0]) throw new Error("callback needed");
				if ("number" != typeof arguments[1]) throw new Error("interval needed");
				var e;
				if (arguments.length > 0) {
					e = new Array(arguments.length - 2);
					for (var r = 0; r < e.length; r++) e[r] = arguments[r + 2]
				}
				return new ReInterval(arguments[0], arguments[1], e)
			}
			module.exports = reInterval;

		}, {}],
		47: [function(require, module, exports) {
			function copyProps(f, r) {
				for (var e in f) r[e] = f[e]
			}

			function SafeBuffer(f, r, e) {
				return Buffer(f, r, e)
			}
			var buffer = require("buffer"),
				Buffer = buffer.Buffer;
			Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow ? module.exports = buffer : (copyProps(buffer, exports), exports.Buffer = SafeBuffer), copyProps(Buffer, SafeBuffer), SafeBuffer.from = function(f, r, e) {
				if ("number" == typeof f) throw new TypeError("Argument must not be a number");
				return Buffer(f, r, e)
			}, SafeBuffer.alloc = function(f, r, e) {
				if ("number" != typeof f) throw new TypeError("Argument must be a number");
				var u = Buffer(f);
				return void 0 !== r ? "string" == typeof e ? u.fill(r, e) : u.fill(r) : u.fill(0), u
			}, SafeBuffer.allocUnsafe = function(f) {
				if ("number" != typeof f) throw new TypeError("Argument must be a number");
				return Buffer(f)
			}, SafeBuffer.allocUnsafeSlow = function(f) {
				if ("number" != typeof f) throw new TypeError("Argument must be a number");
				return buffer.SlowBuffer(f)
			};

		}, {
			"buffer": 11
		}],
		48: [function(require, module, exports) {
			function shift(e) {
				var t = e._readableState;
				return t ? t.objectMode ? e.read() : e.read(getStateLength(t)) : null
			}

			function getStateLength(e) {
				return e.buffer.length ? e.buffer.head ? e.buffer.head.data.length : e.buffer[0].length : e.length
			}
			module.exports = shift;

		}, {}],
		49: [function(require, module, exports) {
			"use strict";

			function _normalizeEncoding(t) {
				if (!t) return "utf8";
				for (var e;;) switch (t) {
					case "utf8":
					case "utf-8":
						return "utf8";
					case "ucs2":
					case "ucs-2":
					case "utf16le":
					case "utf-16le":
						return "utf16le";
					case "latin1":
					case "binary":
						return "latin1";
					case "base64":
					case "ascii":
					case "hex":
						return t;
					default:
						if (e) return;
						t = ("" + t).toLowerCase(), e = !0
				}
			}

			function normalizeEncoding(t) {
				var e = _normalizeEncoding(t);
				if ("string" != typeof e && (Buffer.isEncoding === isEncoding || !isEncoding(t))) throw new Error("Unknown encoding: " + t);
				return e || t
			}

			function StringDecoder(t) {
				this.encoding = normalizeEncoding(t);
				var e;
				switch (this.encoding) {
					case "utf16le":
						this.text = utf16Text, this.end = utf16End, e = 4;
						break;
					case "utf8":
						this.fillLast = utf8FillLast, e = 4;
						break;
					case "base64":
						this.text = base64Text, this.end = base64End, e = 3;
						break;
					default:
						return this.write = simpleWrite, void(this.end = simpleEnd)
				}
				this.lastNeed = 0, this.lastTotal = 0, this.lastChar = Buffer.allocUnsafe(e)
			}

			function utf8CheckByte(t) {
				return t <= 127 ? 0 : t >> 5 == 6 ? 2 : t >> 4 == 14 ? 3 : t >> 3 == 30 ? 4 : -1
			}

			function utf8CheckIncomplete(t, e, s) {
				var i = e.length - 1;
				if (i < s) return 0;
				var a = utf8CheckByte(e[i]);
				return a >= 0 ? (a > 0 && (t.lastNeed = a - 1), a) : --i < s ? 0 : (a = utf8CheckByte(e[i])) >= 0 ? (a > 0 && (t.lastNeed = a - 2), a) : --i < s ? 0 : (a = utf8CheckByte(e[i])) >= 0 ? (a > 0 && (2 === a ? a = 0 : t.lastNeed = a - 3), a) : 0
			}

			function utf8CheckExtraBytes(t, e, s) {
				if (128 != (192 & e[0])) return t.lastNeed = 0, "ï¿½".repeat(s);
				if (t.lastNeed > 1 && e.length > 1) {
					if (128 != (192 & e[1])) return t.lastNeed = 1, "ï¿½".repeat(s + 1);
					if (t.lastNeed > 2 && e.length > 2 && 128 != (192 & e[2])) return t.lastNeed = 2, "ï¿½".repeat(s + 2)
				}
			}

			function utf8FillLast(t) {
				var e = this.lastTotal - this.lastNeed,
					s = utf8CheckExtraBytes(this, t, e);
				return void 0 !== s ? s : this.lastNeed <= t.length ? (t.copy(this.lastChar, e, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal)) : (t.copy(this.lastChar, e, 0, t.length), void(this.lastNeed -= t.length))
			}

			function utf8Text(t, e) {
				var s = utf8CheckIncomplete(this, t, e);
				if (!this.lastNeed) return t.toString("utf8", e);
				this.lastTotal = s;
				var i = t.length - (s - this.lastNeed);
				return t.copy(this.lastChar, 0, i), t.toString("utf8", e, i)
			}

			function utf8End(t) {
				var e = t && t.length ? this.write(t) : "";
				return this.lastNeed ? e + "ï¿½".repeat(this.lastTotal - this.lastNeed) : e
			}

			function utf16Text(t, e) {
				if ((t.length - e) % 2 == 0) {
					var s = t.toString("utf16le", e);
					if (s) {
						var i = s.charCodeAt(s.length - 1);
						if (i >= 55296 && i <= 56319) return this.lastNeed = 2, this.lastTotal = 4, this.lastChar[0] = t[t.length - 2], this.lastChar[1] = t[t.length - 1], s.slice(0, -1)
					}
					return s
				}
				return this.lastNeed = 1, this.lastTotal = 2, this.lastChar[0] = t[t.length - 1], t.toString("utf16le", e, t.length - 1)
			}

			function utf16End(t) {
				var e = t && t.length ? this.write(t) : "";
				if (this.lastNeed) {
					var s = this.lastTotal - this.lastNeed;
					return e + this.lastChar.toString("utf16le", 0, s)
				}
				return e
			}

			function base64Text(t, e) {
				var s = (t.length - e) % 3;
				return 0 === s ? t.toString("base64", e) : (this.lastNeed = 3 - s, this.lastTotal = 3, 1 === s ? this.lastChar[0] = t[t.length - 1] : (this.lastChar[0] = t[t.length - 2], this.lastChar[1] = t[t.length - 1]), t.toString("base64", e, t.length - s))
			}

			function base64End(t) {
				var e = t && t.length ? this.write(t) : "";
				return this.lastNeed ? e + this.lastChar.toString("base64", 0, 3 - this.lastNeed) : e
			}

			function simpleWrite(t) {
				return t.toString(this.encoding)
			}

			function simpleEnd(t) {
				return t && t.length ? this.write(t) : ""
			}
			var Buffer = require("safe-buffer").Buffer,
				isEncoding = Buffer.isEncoding || function(t) {
					switch ((t = "" + t) && t.toLowerCase()) {
						case "hex":
						case "utf8":
						case "utf-8":
						case "ascii":
						case "binary":
						case "base64":
						case "ucs2":
						case "ucs-2":
						case "utf16le":
						case "utf-16le":
						case "raw":
							return !0;
						default:
							return !1
					}
				};
			exports.StringDecoder = StringDecoder, StringDecoder.prototype.write = function(t) {
				if (0 === t.length) return "";
				var e, s;
				if (this.lastNeed) {
					if (void 0 === (e = this.fillLast(t))) return "";
					s = this.lastNeed, this.lastNeed = 0
				} else s = 0;
				return s < t.length ? e ? e + this.text(t, s) : this.text(t, s) : e || ""
			}, StringDecoder.prototype.end = utf8End, StringDecoder.prototype.text = utf8Text, StringDecoder.prototype.fillLast = function(t) {
				if (this.lastNeed <= t.length) return t.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed), this.lastChar.toString(this.encoding, 0, this.lastTotal);
				t.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, t.length), this.lastNeed -= t.length
			};

		}, {
			"safe-buffer": 47
		}],
		50: [function(require, module, exports) {
			"use strict";

			function Url() {
				this.protocol = null, this.slashes = null, this.auth = null, this.host = null, this.port = null, this.hostname = null, this.hash = null, this.search = null, this.query = null, this.pathname = null, this.path = null, this.href = null
			}

			function urlParse(t, s, e) {
				if (t && util.isObject(t) && t instanceof Url) return t;
				var h = new Url;
				return h.parse(t, s, e), h
			}

			function urlFormat(t) {
				return util.isString(t) && (t = urlParse(t)), t instanceof Url ? t.format() : Url.prototype.format.call(t)
			}

			function urlResolve(t, s) {
				return urlParse(t, !1, !0).resolve(s)
			}

			function urlResolveObject(t, s) {
				return t ? urlParse(t, !1, !0).resolveObject(s) : s
			}
			var punycode = require("punycode"),
				util = require("./util");
			exports.parse = urlParse, exports.resolve = urlResolve, exports.resolveObject = urlResolveObject, exports.format = urlFormat, exports.Url = Url;
			var protocolPattern = /^([a-z0-9.+-]+:)/i,
				portPattern = /:[0-9]*$/,
				simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,
				delims = ["<", ">", '"', "`", " ", "\r", "\n", "\t"],
				unwise = ["{", "}", "|", "\\", "^", "`"].concat(delims),
				autoEscape = ["'"].concat(unwise),
				nonHostChars = ["%", "/", "?", ";", "#"].concat(autoEscape),
				hostEndingChars = ["/", "?", "#"],
				hostnameMaxLen = 255,
				hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
				hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
				unsafeProtocol = {
					javascript: !0,
					"javascript:": !0
				},
				hostlessProtocol = {
					javascript: !0,
					"javascript:": !0
				},
				slashedProtocol = {
					http: !0,
					https: !0,
					ftp: !0,
					gopher: !0,
					file: !0,
					"http:": !0,
					"https:": !0,
					"ftp:": !0,
					"gopher:": !0,
					"file:": !0
				},
				querystring = require("querystring");
			Url.prototype.parse = function(t, s, e) {
				if (!util.isString(t)) throw new TypeError("Parameter 'url' must be a string, not " + typeof t);
				var h = t.indexOf("?"),
					r = -1 !== h && h < t.indexOf("#") ? "?" : "#",
					a = t.split(r),
					o = /\\/g;
				a[0] = a[0].replace(o, "/");
				var n = t = a.join(r);
				if (n = n.trim(), !e && 1 === t.split("#").length) {
					var i = simplePathPattern.exec(n);
					if (i) return this.path = n, this.href = n, this.pathname = i[1], i[2] ? (this.search = i[2], this.query = s ? querystring.parse(this.search.substr(1)) : this.search.substr(1)) : s && (this.search = "", this.query = {}), this
				}
				var l = protocolPattern.exec(n);
				if (l) {
					var u = (l = l[0]).toLowerCase();
					this.protocol = u, n = n.substr(l.length)
				}
				if (e || l || n.match(/^\/\/[^@\/]+@[^@\/]+/)) {
					var p = "//" === n.substr(0, 2);
					!p || l && hostlessProtocol[l] || (n = n.substr(2), this.slashes = !0)
				}
				if (!hostlessProtocol[l] && (p || l && !slashedProtocol[l])) {
					for (var c = -1, f = 0; f < hostEndingChars.length; f++) - 1 !== (g = n.indexOf(hostEndingChars[f])) && (-1 === c || g < c) && (c = g);
					var m, v; - 1 !== (v = -1 === c ? n.lastIndexOf("@") : n.lastIndexOf("@", c)) && (m = n.slice(0, v), n = n.slice(v + 1), this.auth = decodeURIComponent(m)), c = -1;
					for (f = 0; f < nonHostChars.length; f++) {
						var g = n.indexOf(nonHostChars[f]); - 1 !== g && (-1 === c || g < c) && (c = g)
					} - 1 === c && (c = n.length), this.host = n.slice(0, c), n = n.slice(c), this.parseHost(), this.hostname = this.hostname || "";
					var y = "[" === this.hostname[0] && "]" === this.hostname[this.hostname.length - 1];
					if (!y)
						for (var P = this.hostname.split(/\./), f = 0, d = P.length; f < d; f++) {
							var b = P[f];
							if (b && !b.match(hostnamePartPattern)) {
								for (var q = "", O = 0, j = b.length; O < j; O++) b.charCodeAt(O) > 127 ? q += "x" : q += b[O];
								if (!q.match(hostnamePartPattern)) {
									var x = P.slice(0, f),
										U = P.slice(f + 1),
										C = b.match(hostnamePartStart);
									C && (x.push(C[1]), U.unshift(C[2])), U.length && (n = "/" + U.join(".") + n), this.hostname = x.join(".");
									break
								}
							}
						}
					this.hostname.length > hostnameMaxLen ? this.hostname = "" : this.hostname = this.hostname.toLowerCase(), y || (this.hostname = punycode.toASCII(this.hostname));
					var A = this.port ? ":" + this.port : "",
						w = this.hostname || "";
					this.host = w + A, this.href += this.host, y && (this.hostname = this.hostname.substr(1, this.hostname.length - 2), "/" !== n[0] && (n = "/" + n))
				}
				if (!unsafeProtocol[u])
					for (var f = 0, d = autoEscape.length; f < d; f++) {
						var E = autoEscape[f];
						if (-1 !== n.indexOf(E)) {
							var I = encodeURIComponent(E);
							I === E && (I = escape(E)), n = n.split(E).join(I)
						}
					}
				var R = n.indexOf("#"); - 1 !== R && (this.hash = n.substr(R), n = n.slice(0, R));
				var S = n.indexOf("?");
				if (-1 !== S ? (this.search = n.substr(S), this.query = n.substr(S + 1), s && (this.query = querystring.parse(this.query)), n = n.slice(0, S)) : s && (this.search = "", this.query = {}), n && (this.pathname = n), slashedProtocol[u] && this.hostname && !this.pathname && (this.pathname = "/"), this.pathname || this.search) {
					var A = this.pathname || "",
						k = this.search || "";
					this.path = A + k
				}
				return this.href = this.format(), this
			}, Url.prototype.format = function() {
				var t = this.auth || "";
				t && (t = (t = encodeURIComponent(t)).replace(/%3A/i, ":"), t += "@");
				var s = this.protocol || "",
					e = this.pathname || "",
					h = this.hash || "",
					r = !1,
					a = "";
				this.host ? r = t + this.host : this.hostname && (r = t + (-1 === this.hostname.indexOf(":") ? this.hostname : "[" + this.hostname + "]"), this.port && (r += ":" + this.port)), this.query && util.isObject(this.query) && Object.keys(this.query).length && (a = querystring.stringify(this.query));
				var o = this.search || a && "?" + a || "";
				return s && ":" !== s.substr(-1) && (s += ":"), this.slashes || (!s || slashedProtocol[s]) && !1 !== r ? (r = "//" + (r || ""), e && "/" !== e.charAt(0) && (e = "/" + e)) : r || (r = ""), h && "#" !== h.charAt(0) && (h = "#" + h), o && "?" !== o.charAt(0) && (o = "?" + o), e = e.replace(/[?#]/g, function(t) {
					return encodeURIComponent(t)
				}), o = o.replace("#", "%23"), s + r + e + o + h
			}, Url.prototype.resolve = function(t) {
				return this.resolveObject(urlParse(t, !1, !0)).format()
			}, Url.prototype.resolveObject = function(t) {
				if (util.isString(t)) {
					var s = new Url;
					s.parse(t, !1, !0), t = s
				}
				for (var e = new Url, h = Object.keys(this), r = 0; r < h.length; r++) {
					var a = h[r];
					e[a] = this[a]
				}
				if (e.hash = t.hash, "" === t.href) return e.href = e.format(), e;
				if (t.slashes && !t.protocol) {
					for (var o = Object.keys(t), n = 0; n < o.length; n++) {
						var i = o[n];
						"protocol" !== i && (e[i] = t[i])
					}
					return slashedProtocol[e.protocol] && e.hostname && !e.pathname && (e.path = e.pathname = "/"), e.href = e.format(), e
				}
				if (t.protocol && t.protocol !== e.protocol) {
					if (!slashedProtocol[t.protocol]) {
						for (var l = Object.keys(t), u = 0; u < l.length; u++) {
							var p = l[u];
							e[p] = t[p]
						}
						return e.href = e.format(), e
					}
					if (e.protocol = t.protocol, t.host || hostlessProtocol[t.protocol]) e.pathname = t.pathname;
					else {
						for (d = (t.pathname || "").split("/"); d.length && !(t.host = d.shift()););
						t.host || (t.host = ""), t.hostname || (t.hostname = ""), "" !== d[0] && d.unshift(""), d.length < 2 && d.unshift(""), e.pathname = d.join("/")
					}
					if (e.search = t.search, e.query = t.query, e.host = t.host || "", e.auth = t.auth, e.hostname = t.hostname || t.host, e.port = t.port, e.pathname || e.search) {
						var c = e.pathname || "",
							f = e.search || "";
						e.path = c + f
					}
					return e.slashes = e.slashes || t.slashes, e.href = e.format(), e
				}
				var m = e.pathname && "/" === e.pathname.charAt(0),
					v = t.host || t.pathname && "/" === t.pathname.charAt(0),
					g = v || m || e.host && t.pathname,
					y = g,
					P = e.pathname && e.pathname.split("/") || [],
					d = t.pathname && t.pathname.split("/") || [],
					b = e.protocol && !slashedProtocol[e.protocol];
				if (b && (e.hostname = "", e.port = null, e.host && ("" === P[0] ? P[0] = e.host : P.unshift(e.host)), e.host = "", t.protocol && (t.hostname = null, t.port = null, t.host && ("" === d[0] ? d[0] = t.host : d.unshift(t.host)), t.host = null), g = g && ("" === d[0] || "" === P[0])), v) e.host = t.host || "" === t.host ? t.host : e.host, e.hostname = t.hostname || "" === t.hostname ? t.hostname : e.hostname, e.search = t.search, e.query = t.query, P = d;
				else if (d.length) P || (P = []), P.pop(), P = P.concat(d), e.search = t.search, e.query = t.query;
				else if (!util.isNullOrUndefined(t.search)) return b && (e.hostname = e.host = P.shift(), (C = !!(e.host && e.host.indexOf("@") > 0) && e.host.split("@")) && (e.auth = C.shift(), e.host = e.hostname = C.shift())), e.search = t.search, e.query = t.query, util.isNull(e.pathname) && util.isNull(e.search) || (e.path = (e.pathname ? e.pathname : "") + (e.search ? e.search : "")), e.href = e.format(), e;
				if (!P.length) return e.pathname = null, e.search ? e.path = "/" + e.search : e.path = null, e.href = e.format(), e;
				for (var q = P.slice(-1)[0], O = (e.host || t.host || P.length > 1) && ("." === q || ".." === q) || "" === q, j = 0, x = P.length; x >= 0; x--) "." === (q = P[x]) ? P.splice(x, 1) : ".." === q ? (P.splice(x, 1), j++) : j && (P.splice(x, 1), j--);
				if (!g && !y)
					for (; j--; j) P.unshift("..");
				!g || "" === P[0] || P[0] && "/" === P[0].charAt(0) || P.unshift(""), O && "/" !== P.join("/").substr(-1) && P.push("");
				var U = "" === P[0] || P[0] && "/" === P[0].charAt(0);
				if (b) {
					e.hostname = e.host = U ? "" : P.length ? P.shift() : "";
					var C = !!(e.host && e.host.indexOf("@") > 0) && e.host.split("@");
					C && (e.auth = C.shift(), e.host = e.hostname = C.shift())
				}
				return (g = g || e.host && P.length) && !U && P.unshift(""), P.length ? e.pathname = P.join("/") : (e.pathname = null, e.path = null), util.isNull(e.pathname) && util.isNull(e.search) || (e.path = (e.pathname ? e.pathname : "") + (e.search ? e.search : "")), e.auth = t.auth || e.auth, e.slashes = e.slashes || t.slashes, e.href = e.format(), e
			}, Url.prototype.parseHost = function() {
				var t = this.host,
					s = portPattern.exec(t);
				s && (":" !== (s = s[0]) && (this.port = s.substr(1)), t = t.substr(0, t.length - s.length)), t && (this.hostname = t)
			};

		}, {
			"./util": 51,
			"punycode": 32,
			"querystring": 35
		}],
		51: [function(require, module, exports) {
			"use strict";
			module.exports = {
				isString: function(n) {
					return "string" == typeof n
				},
				isObject: function(n) {
					return "object" == typeof n && null !== n
				},
				isNull: function(n) {
					return null === n
				},
				isNullOrUndefined: function(n) {
					return null == n
				}
			};

		}, {}],
		52: [function(require, module, exports) {
			(function(global) {
				function deprecate(r, e) {
					if (config("noDeprecation")) return r;
					var o = !1;
					return function() {
						if (!o) {
							if (config("throwDeprecation")) throw new Error(e);
							config("traceDeprecation") ? console.trace(e) : console.warn(e), o = !0
						}
						return r.apply(this, arguments)
					}
				}

				function config(r) {
					try {
						if (!global.localStorage) return !1
					} catch (r) {
						return !1
					}
					var e = global.localStorage[r];
					return null != e && "true" === String(e).toLowerCase()
				}
				module.exports = deprecate;

			}).call(this, typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
		}, {}],
		53: [function(require, module, exports) {
			"function" == typeof Object.create ? module.exports = function(t, e) {
				t.super_ = e, t.prototype = Object.create(e.prototype, {
					constructor: {
						value: t,
						enumerable: !1,
						writable: !0,
						configurable: !0
					}
				})
			} : module.exports = function(t, e) {
				t.super_ = e;
				var o = function() {};
				o.prototype = e.prototype, t.prototype = new o, t.prototype.constructor = t
			};

		}, {}],
		54: [function(require, module, exports) {
			module.exports = function(o) {
				return o && "object" == typeof o && "function" == typeof o.copy && "function" == typeof o.fill && "function" == typeof o.readUInt8
			};

		}, {}],
		55: [function(require, module, exports) {
			(function(process, global) {
				function inspect(e, r) {
					var t = {
						seen: [],
						stylize: stylizeNoColor
					};
					return arguments.length >= 3 && (t.depth = arguments[2]), arguments.length >= 4 && (t.colors = arguments[3]), isBoolean(r) ? t.showHidden = r : r && exports._extend(t, r), isUndefined(t.showHidden) && (t.showHidden = !1), isUndefined(t.depth) && (t.depth = 2), isUndefined(t.colors) && (t.colors = !1), isUndefined(t.customInspect) && (t.customInspect = !0), t.colors && (t.stylize = stylizeWithColor), formatValue(t, e, t.depth)
				}

				function stylizeWithColor(e, r) {
					var t = inspect.styles[r];
					return t ? "[" + inspect.colors[t][0] + "m" + e + "[" + inspect.colors[t][1] + "m" : e
				}

				function stylizeNoColor(e, r) {
					return e
				}

				function arrayToHash(e) {
					var r = {};
					return e.forEach(function(e, t) {
						r[e] = !0
					}), r
				}

				function formatValue(e, r, t) {
					if (e.customInspect && r && isFunction(r.inspect) && r.inspect !== exports.inspect && (!r.constructor || r.constructor.prototype !== r)) {
						var n = r.inspect(t, e);
						return isString(n) || (n = formatValue(e, n, t)), n
					}
					var i = formatPrimitive(e, r);
					if (i) return i;
					var o = Object.keys(r),
						s = arrayToHash(o);
					if (e.showHidden && (o = Object.getOwnPropertyNames(r)), isError(r) && (o.indexOf("message") >= 0 || o.indexOf("description") >= 0)) return formatError(r);
					if (0 === o.length) {
						if (isFunction(r)) {
							var u = r.name ? ": " + r.name : "";
							return e.stylize("[Function" + u + "]", "special")
						}
						if (isRegExp(r)) return e.stylize(RegExp.prototype.toString.call(r), "regexp");
						if (isDate(r)) return e.stylize(Date.prototype.toString.call(r), "date");
						if (isError(r)) return formatError(r)
					}
					var c = "",
						a = !1,
						l = ["{", "}"];
					if (isArray(r) && (a = !0, l = ["[", "]"]), isFunction(r) && (c = " [Function" + (r.name ? ": " + r.name : "") + "]"), isRegExp(r) && (c = " " + RegExp.prototype.toString.call(r)), isDate(r) && (c = " " + Date.prototype.toUTCString.call(r)), isError(r) && (c = " " + formatError(r)), 0 === o.length && (!a || 0 == r.length)) return l[0] + c + l[1];
					if (t < 0) return isRegExp(r) ? e.stylize(RegExp.prototype.toString.call(r), "regexp") : e.stylize("[Object]", "special");
					e.seen.push(r);
					var p;
					return p = a ? formatArray(e, r, t, s, o) : o.map(function(n) {
						return formatProperty(e, r, t, s, n, a)
					}), e.seen.pop(), reduceToSingleString(p, c, l)
				}

				function formatPrimitive(e, r) {
					if (isUndefined(r)) return e.stylize("undefined", "undefined");
					if (isString(r)) {
						var t = "'" + JSON.stringify(r).replace(/^"|"$/g, "").replace(/'/g, "\\'").replace(/\\"/g, '"') + "'";
						return e.stylize(t, "string")
					}
					return isNumber(r) ? e.stylize("" + r, "number") : isBoolean(r) ? e.stylize("" + r, "boolean") : isNull(r) ? e.stylize("null", "null") : void 0
				}

				function formatError(e) {
					return "[" + Error.prototype.toString.call(e) + "]"
				}

				function formatArray(e, r, t, n, i) {
					for (var o = [], s = 0, u = r.length; s < u; ++s) hasOwnProperty(r, String(s)) ? o.push(formatProperty(e, r, t, n, String(s), !0)) : o.push("");
					return i.forEach(function(i) {
						i.match(/^\d+$/) || o.push(formatProperty(e, r, t, n, i, !0))
					}), o
				}

				function formatProperty(e, r, t, n, i, o) {
					var s, u, c;
					if ((c = Object.getOwnPropertyDescriptor(r, i) || {
							value: r[i]
						}).get ? u = c.set ? e.stylize("[Getter/Setter]", "special") : e.stylize("[Getter]", "special") : c.set && (u = e.stylize("[Setter]", "special")), hasOwnProperty(n, i) || (s = "[" + i + "]"), u || (e.seen.indexOf(c.value) < 0 ? (u = isNull(t) ? formatValue(e, c.value, null) : formatValue(e, c.value, t - 1)).indexOf("\n") > -1 && (u = o ? u.split("\n").map(function(e) {
							return "  " + e
						}).join("\n").substr(2) : "\n" + u.split("\n").map(function(e) {
							return "   " + e
						}).join("\n")) : u = e.stylize("[Circular]", "special")), isUndefined(s)) {
						if (o && i.match(/^\d+$/)) return u;
						(s = JSON.stringify("" + i)).match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/) ? (s = s.substr(1, s.length - 2), s = e.stylize(s, "name")) : (s = s.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'"), s = e.stylize(s, "string"))
					}
					return s + ": " + u
				}

				function reduceToSingleString(e, r, t) {
					var n = 0;
					return e.reduce(function(e, r) {
						return n++, r.indexOf("\n") >= 0 && n++, e + r.replace(/\u001b\[\d\d?m/g, "").length + 1
					}, 0) > 60 ? t[0] + ("" === r ? "" : r + "\n ") + " " + e.join(",\n  ") + " " + t[1] : t[0] + r + " " + e.join(", ") + " " + t[1]
				}

				function isArray(e) {
					return Array.isArray(e)
				}

				function isBoolean(e) {
					return "boolean" == typeof e
				}

				function isNull(e) {
					return null === e
				}

				function isNullOrUndefined(e) {
					return null == e
				}

				function isNumber(e) {
					return "number" == typeof e
				}

				function isString(e) {
					return "string" == typeof e
				}

				function isSymbol(e) {
					return "symbol" == typeof e
				}

				function isUndefined(e) {
					return void 0 === e
				}

				function isRegExp(e) {
					return isObject(e) && "[object RegExp]" === objectToString(e)
				}

				function isObject(e) {
					return "object" == typeof e && null !== e
				}

				function isDate(e) {
					return isObject(e) && "[object Date]" === objectToString(e)
				}

				function isError(e) {
					return isObject(e) && ("[object Error]" === objectToString(e) || e instanceof Error)
				}

				function isFunction(e) {
					return "function" == typeof e
				}

				function isPrimitive(e) {
					return null === e || "boolean" == typeof e || "number" == typeof e || "string" == typeof e || "symbol" == typeof e || void 0 === e
				}

				function objectToString(e) {
					return Object.prototype.toString.call(e)
				}

				function pad(e) {
					return e < 10 ? "0" + e.toString(10) : e.toString(10)
				}

				function timestamp() {
					var e = new Date,
						r = [pad(e.getHours()), pad(e.getMinutes()), pad(e.getSeconds())].join(":");
					return [e.getDate(), months[e.getMonth()], r].join(" ")
				}

				function hasOwnProperty(e, r) {
					return Object.prototype.hasOwnProperty.call(e, r)
				}
				var formatRegExp = /%[sdj%]/g;
				exports.format = function(e) {
					if (!isString(e)) {
						for (var r = [], t = 0; t < arguments.length; t++) r.push(inspect(arguments[t]));
						return r.join(" ")
					}
					for (var t = 1, n = arguments, i = n.length, o = String(e).replace(formatRegExp, function(e) {
							if ("%%" === e) return "%";
							if (t >= i) return e;
							switch (e) {
								case "%s":
									return String(n[t++]);
								case "%d":
									return Number(n[t++]);
								case "%j":
									try {
										return JSON.stringify(n[t++])
									} catch (e) {
										return "[Circular]"
									}
								default:
									return e
							}
						}), s = n[t]; t < i; s = n[++t]) isNull(s) || !isObject(s) ? o += " " + s : o += " " + inspect(s);
					return o
				}, exports.deprecate = function(e, r) {
					if (isUndefined(global.process)) return function() {
						return exports.deprecate(e, r).apply(this, arguments)
					};
					if (!0 === process.noDeprecation) return e;
					var t = !1;
					return function() {
						if (!t) {
							if (process.throwDeprecation) throw new Error(r);
							process.traceDeprecation ? console.trace(r) : console.error(r), t = !0
						}
						return e.apply(this, arguments)
					}
				};
				var debugs = {},
					debugEnviron;
				exports.debuglog = function(e) {
					if (isUndefined(debugEnviron) && (debugEnviron = process.env.NODE_DEBUG || ""), e = e.toUpperCase(), !debugs[e])
						if (new RegExp("\\b" + e + "\\b", "i").test(debugEnviron)) {
							var r = process.pid;
							debugs[e] = function() {
								var t = exports.format.apply(exports, arguments);
								console.error("%s %d: %s", e, r, t)
							}
						} else debugs[e] = function() {};
					return debugs[e]
				}, exports.inspect = inspect, inspect.colors = {
					bold: [1, 22],
					italic: [3, 23],
					underline: [4, 24],
					inverse: [7, 27],
					white: [37, 39],
					grey: [90, 39],
					black: [30, 39],
					blue: [34, 39],
					cyan: [36, 39],
					green: [32, 39],
					magenta: [35, 39],
					red: [31, 39],
					yellow: [33, 39]
				}, inspect.styles = {
					special: "cyan",
					number: "yellow",
					boolean: "yellow",
					undefined: "grey",
					null: "bold",
					string: "green",
					date: "magenta",
					regexp: "red"
				}, exports.isArray = isArray, exports.isBoolean = isBoolean, exports.isNull = isNull, exports.isNullOrUndefined = isNullOrUndefined, exports.isNumber = isNumber, exports.isString = isString, exports.isSymbol = isSymbol, exports.isUndefined = isUndefined, exports.isRegExp = isRegExp, exports.isObject = isObject, exports.isDate = isDate, exports.isError = isError, exports.isFunction = isFunction, exports.isPrimitive = isPrimitive, exports.isBuffer = require("./support/isBuffer");
				var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
				exports.log = function() {
					console.log("%s - %s", timestamp(), exports.format.apply(exports, arguments))
				}, exports.inherits = require("inherits"), exports._extend = function(e, r) {
					if (!r || !isObject(r)) return e;
					for (var t = Object.keys(r), n = t.length; n--;) e[t[n]] = r[t[n]];
					return e
				};

			}).call(this, require('_process'), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
		}, {
			"./support/isBuffer": 54,
			"_process": 31,
			"inherits": 53
		}],
		56: [function(require, module, exports) {
			(function(process, global) {
				"use strict";

				function buildProxy(e, r, o) {
					var t = new Transform({
						objectMode: e.objectMode
					});
					return t._destroyed = !1, t._write = r, t._flush = o, t.destroy = function(e) {
						if (!this._destroyed) {
							this._destroyed = !0;
							var r = this;
							process.nextTick(function() {
								e && r.emit("error", e), r.emit("close")
							})
						}
					}, t
				}

				function WebSocketStream(e, r, o) {
					function t(e, r, o) {
						if (f.bufferedAmount > a) setTimeout(t, y, e, r, o);
						else {
							d && "string" == typeof e && (e = new Buffer(e, "utf8"));
							try {
								f.send(e)
							} catch (e) {
								return o(e)
							}
							o()
						}
					}
					var n, f, i = "browser" === process.title,
						u = !!global.WebSocket,
						s = i ? t : function(e, r, o) {
							f.readyState === WS.OPEN ? (d && "string" == typeof e && (e = new Buffer(e, "utf8")), f.send(e, o)) : o()
						};
					r && !Array.isArray(r) && "object" == typeof r && (o = r, r = null, ("string" == typeof o.protocol || Array.isArray(o.protocol)) && (r = o.protocol)), o || (o = {}), void 0 === o.objectMode && (o.objectMode = !(!0 === o.binary || void 0 === o.binary));
					var c = buildProxy(o, s, function(e) {
						f.close(), e()
					});
					o.objectMode || (c._writev = function(e, r) {
						for (var o = new Array(e.length), t = 0; t < e.length; t++) "string" == typeof e[t].chunk ? o[t] = Buffer.from(e[t], "utf8") : o[t] = e[t].chunk;
						this._write(Buffer.concat(o), "binary", r)
					});
					var a = o.browserBufferSize || 524288,
						y = o.browserBufferTimeout || 1e3;
					"object" == typeof e ? f = e : (f = u && i ? new WS(e, r) : new WS(e, r, o)).binaryType = "arraybuffer", f.readyState === WS.OPEN ? n = c : (n = duplexify.obj(), f.onopen = function() {
						n.setReadable(c), n.setWritable(c), n.emit("connect")
					}), n.socket = f, f.onclose = function() {
						n.end(), n.destroy()
					}, f.onerror = function(e) {
						n.destroy(e)
					}, f.onmessage = function(e) {
						var r = e.data;
						r = r instanceof ArrayBuffer ? Buffer.from(new Uint8Array(r)) : Buffer.from(r, "utf8"), c.push(r)
					}, c.on("close", function() {
						f.close()
					});
					var d = !o.objectMode;
					return n
				}
				var Transform = require("readable-stream").Transform,
					duplexify = require("duplexify"),
					WS = require("ws"),
					Buffer = require("safe-buffer").Buffer;
				module.exports = WebSocketStream;

			}).call(this, require('_process'), typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
		}, {
			"_process": 31,
			"duplexify": 13,
			"readable-stream": 45,
			"safe-buffer": 47,
			"ws": 57
		}],
		57: [function(require, module, exports) {
			var ws = null;
			ws = "undefined" != typeof WebSocket ? WebSocket : "undefined" != typeof MozWebSocket ? MozWebSocket : window.WebSocket || window.MozWebSocket, module.exports = ws;

		}, {}],
		58: [function(require, module, exports) {
			function wrappy(n, r) {
				function e() {
					for (var r = new Array(arguments.length), e = 0; e < r.length; e++) r[e] = arguments[e];
					var t = n.apply(this, r),
						o = r[r.length - 1];
					return "function" == typeof t && t !== o && Object.keys(o).forEach(function(n) {
						t[n] = o[n]
					}), t
				}
				if (n && r) return wrappy(n)(r);
				if ("function" != typeof n) throw new TypeError("need wrapper function");
				return Object.keys(n).forEach(function(r) {
					e[r] = n[r]
				}), e
			}
			module.exports = wrappy;

		}, {}],
		59: [function(require, module, exports) {
			function extend() {
				for (var r = {}, e = 0; e < arguments.length; e++) {
					var t = arguments[e];
					for (var n in t) hasOwnProperty.call(t, n) && (r[n] = t[n])
				}
				return r
			}
			module.exports = extend;
			var hasOwnProperty = Object.prototype.hasOwnProperty;

		}, {}]
	}, {}, [7])(7)
});