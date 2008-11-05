/* boot.js

	Purpose:
		
	Description:
		
	History:
		Sat Oct 18 19:24:38     2008, Created by tomyeh

Copyright (C) 2008 Potix Corporation. All Rights Reserved.

	This program is distributed under GPL Version 2.0 in the hope that
	it will be useful, but WITHOUT ANY WARRANTY.
*/
/** Begins the creating of new page(s). */
function zknewbg() {
	zk.creating = true;
	zk.startProcessing(600);
}
/** Ends the creating of new page(s). */
function zknewe() {
	zk.creating = false;
	_zkws = []; //clean up if failed
	zkcurdt = null;
}

/** Used internally. */
function _zkpush(w) {
	w.children = [];
	if (_zkws.length > 0)
		_zkws[0].children.add(w);
	_zkws.unshift(w);
}
/** Used internally. */
function _zkpop() {
	var w = _zkws.shift();
	if (!_zkws.length) {
		_zkld(w); //OK to load JS before document.readyState complete

		_zkcrs.push([zkcurdt, w]);

		if (zk.creating) { //creating a new page
			if (zk.booted)
				_zkldnew();
			else if (document.readyState) {
				var tid = setInterval(function(){
					if (/loaded|complete/.test(document.readyState)) {
						clearInterval(tid);
						if (!zk.booted) _zkinit();
						_zkldnew();
					}
				}, 50);
			} else //gecko
				setTimeout(_zkldnew, 100);
				//don't count on DOMContentLoaded since the page might
				//be loaded by another ajax solution (i.e., portal)
				//Also, Bug 1619959: FF not fire it if in 2nd iframe
		} else //AU
			_zkaunew();
	}
}

/** Begins the creation of a page generated by the server.
 *
 * @param contained if a page is not owned by another page, and
 * it doesn't cover the whole browser window (included by non-ZK tech)
 */
function zkpgbg(pgid, style, dtid, contained, updateURI) {
	var props = {};
	if (style) props.style = style;
	if (dtid) {
		var dt = zkdtbg(dtid, updateURI);
		dt.pgid = pgid;
		props.desktop = dt;
	}
	_zkpush({type: "#p", uuid: pgid, contained: contained, props: props});
}
/** Ends the creation of a page.
 */
zkpge = _zkpop;

/** Begins the creation of a widget generated by the server.
 */
function zkbg(type, uuid, mold, props) {
	_zkpush({type: type, uuid: uuid, mold: mold, props: props});
}
/** Ends the creation of a widget. */
zke = _zkpop;

/** Begins the creation of a desktop generated by the server.
 * This method is called only if zkpgbg is not called.
 * <p>Note: there is no zken().
 */
function zkdtbg(dtid, updateURI) {
	var dt = zk.Desktop.$(dtid);
	if (dt == null) dt = new zk.Desktop(dtid, updateURI);
	else if (updateURI) dt.updateURI = updateURI;
	zkcurdt = dt;
	return dt;
}

//Init Only//
/** Sets the version. */
function zkver() {
	var args = arguments, len = args.length;
	zk.version = args[0];
	zk.build = args[1];

	for (var j = 2; j < len; j += 2)
		zPkg.version(args[j], args[j + 1]);
}

/** Sets the options. */
function zkopt(opts) {
	for (var nm in opts) {
		var val = opts[nm];
		switch (nm) {
		case "pd": zk.procDelay = val; break;
		case "td": zk.tipDelay =  val; break;
		case "rd": zk.resendDelay = val; break;
		case "dj": zk.debugJS = val; break;
		case "kd": zk.keepDesktop = val; break;
		case "pf": zk.pfmeter = val; break;
		}
	}
}

/** Adds a function that will be executed after widgets are created.
 * It is called immediately if widgets are created.
 * It is used by ZK Loader to generate JavaScript codes that will
 * be executed
 */
function zkafter(fn) {
	if (!zk.booted)
		return _zkafcrs.add(fn, true);
	fn();
	return true;
}
var _zkafcrs = [];

/** Adds a function that will be executed after the document
 * is intialized (i.e., zk.booted is true). It is called immediately
 * if the document is initialized.
 */
function zkafterBoot(fn) {
	if (!zk.booted)
		return _zkafbts.add(fn, true);
	fn();
	return true;
}
var _zkafbts = [];

//Internal Use//
/** Initiailizes document (called only once). */
function _zkinit() {
	zk.booted = true;

	//TODO more listener
	zEvt.listen(document, "click", _zkDocLClick);

	for (var fn, afbts = _zkafbts; fn = afbts.shift();)
		fn();
}
/** Attaches the widgets generated by ZK loader. */
function _zkldnew() {
	zPkg.afterLoad(_zkldnew0);
}
function _zkldnew0() {
	if (!zk.booted) _zkinit();

	for (var inf; inf = _zkcrs.shift();) {
		var dt = inf[0],
			wgt = _zkcreate(null, inf[1]);
		wgt.replaceHTML(wgt.uuid, dt);
	}

	for (var fn, afcrs = _zkafcrs; fn = afcrs.shift();)
		fn();

	zk.endProcessing();
}
/** Creates the widgets generated by ZK loader. */
function _zkaunew() {
	zPkg.afterLoad(function () {_zkaunew0(_zkauf);});
}
function _zkaunew0(fn) {
	for (var inf; inf = _zkcrs.shift();)
		fn(_zkcreate(null, inf[1]));
}
/** Used internally to create the widget tree. */
function _zkcreate(parent, wginf) {
	var wgt, props = wginf.props;
	if (wginf.type == "#p") {
		wgt = new zk.Page(wginf.uuid, wginf.contained);
		if (parent) parent.appendChild(wgt);
	} else {
		var cls = zk.$import(wginf.type),
			uuid = wginf.uuid,
			wgt = new cls(uuid, wginf.mold),
			embedAs = cls.embedAs;
		wgt.inServer = true;
		if (parent) parent.appendChild(wgt);

		//embedAs means value from element's text
		if (embedAs && !props[embedAs]) {
			var embed = zDom.$(uuid);
			if (embed)
				props[embedAs] = embed.innerHTML;
		}
	}

	//assign properties
	for (var p in props)
		zk.assign(wgt, p, props[p]);

	for (var j = 0, childs = wginf.children, len = childs.length;
	j < len; ++j)
		_zkcreate(wgt, childs[j]);

	return wgt;
}
/** Used internally to load package of the specified widget/page. */
function _zkld(w) {
	var type = w.type; j = type.lastIndexOf('.');
	if (j >= 0)
		zPkg.load(type.substring(0, j), zkcurdt);
	for (var children = w.children, len = children.length, j = 0; j < len;++j)
		_zkld(children[j]);
}

/** Used internally. */
var _zkws = [], zkcurdt, _zkcrs = []; //used to load widget

//Event Handler//
function _zkDocLClick(evt) {
	if (!evt) evt = window.event;

	if (evt.which == 1 || (evt.button == 0 || evt.button == 1)) {
		var wgt = zEvt.widget(evt);
		for (; wgt; wgt = wgt.parent)
			if (wgt.onClick != zk.undefined) {
				wgt.fire2("onClick");
				return;
			}
		//no need to Event.stop
	}
	//don't return anything. Otherwise, it replaces event.returnValue in IE (Bug 1541132)
};
