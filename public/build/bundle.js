
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/header.svelte generated by Svelte v3.32.3 */

    const file = "src/components/header.svelte";

    // (17:4) {#if mediaWidth < 600}
    function create_if_block(ctx) {
    	let br;

    	const block = {
    		c: function create() {
    			br = element("br");
    			attr_dev(br, "class", "hide svelte-vdrw3g");
    			add_location(br, file, 17, 6, 422);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, br, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(br);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(17:4) {#if mediaWidth < 600}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let link0;
    	let link1;
    	let t0;
    	let header;
    	let h1;
    	let t1;
    	let t2;
    	let span;
    	let h1_class_value;
    	let header_class_value;
    	let if_block = /*mediaWidth*/ ctx[1] < 600 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			link0 = element("link");
    			link1 = element("link");
    			t0 = space();
    			header = element("header");
    			h1 = element("h1");
    			t1 = text("Hi.\n    ");
    			if (if_block) if_block.c();
    			t2 = space();
    			span = element("span");
    			span.textContent = "I'm Jack.";
    			attr_dev(link0, "rel", "preconnect");
    			attr_dev(link0, "href", "https://fonts.gstatic.com");
    			attr_dev(link0, "class", "svelte-vdrw3g");
    			add_location(link0, file, 6, 2, 85);
    			attr_dev(link1, "href", "https://fonts.googleapis.com/css2?family=Nunito:wght@200;300;400&display=swap");
    			attr_dev(link1, "rel", "stylesheet");
    			attr_dev(link1, "class", "svelte-vdrw3g");
    			add_location(link1, file, 7, 2, 146);
    			attr_dev(span, "class", "svelte-vdrw3g");
    			add_location(span, file, 19, 4, 456);
    			attr_dev(h1, "class", h1_class_value = "" + (null_to_empty(/*makeSmall*/ ctx[0] ? "shrink" : "expand") + " svelte-vdrw3g"));
    			add_location(h1, file, 14, 2, 336);
    			attr_dev(header, "class", header_class_value = "" + (null_to_empty(/*makeSmall*/ ctx[0] ? "shrinko" : "expando") + " svelte-vdrw3g"));
    			add_location(header, file, 13, 0, 283);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link0);
    			append_dev(document.head, link1);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    			append_dev(h1, t1);
    			if (if_block) if_block.m(h1, null);
    			append_dev(h1, t2);
    			append_dev(h1, span);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*mediaWidth*/ ctx[1] < 600) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(h1, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*makeSmall*/ 1 && h1_class_value !== (h1_class_value = "" + (null_to_empty(/*makeSmall*/ ctx[0] ? "shrink" : "expand") + " svelte-vdrw3g"))) {
    				attr_dev(h1, "class", h1_class_value);
    			}

    			if (dirty & /*makeSmall*/ 1 && header_class_value !== (header_class_value = "" + (null_to_empty(/*makeSmall*/ ctx[0] ? "shrinko" : "expando") + " svelte-vdrw3g"))) {
    				attr_dev(header, "class", header_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link0);
    			detach_dev(link1);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(header);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Header", slots, []);
    	let { makeSmall } = $$props;
    	let { mediaWidth } = $$props;
    	const writable_props = ["makeSmall", "mediaWidth"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("makeSmall" in $$props) $$invalidate(0, makeSmall = $$props.makeSmall);
    		if ("mediaWidth" in $$props) $$invalidate(1, mediaWidth = $$props.mediaWidth);
    	};

    	$$self.$capture_state = () => ({ makeSmall, mediaWidth });

    	$$self.$inject_state = $$props => {
    		if ("makeSmall" in $$props) $$invalidate(0, makeSmall = $$props.makeSmall);
    		if ("mediaWidth" in $$props) $$invalidate(1, mediaWidth = $$props.mediaWidth);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [makeSmall, mediaWidth];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { makeSmall: 0, mediaWidth: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*makeSmall*/ ctx[0] === undefined && !("makeSmall" in props)) {
    			console.warn("<Header> was created without expected prop 'makeSmall'");
    		}

    		if (/*mediaWidth*/ ctx[1] === undefined && !("mediaWidth" in props)) {
    			console.warn("<Header> was created without expected prop 'mediaWidth'");
    		}
    	}

    	get makeSmall() {
    		throw new Error("<Header>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set makeSmall(value) {
    		throw new Error("<Header>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get mediaWidth() {
    		throw new Error("<Header>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set mediaWidth(value) {
    		throw new Error("<Header>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/textblurb.svelte generated by Svelte v3.32.3 */

    const file$1 = "src/components/textblurb.svelte";

    // (14:2) {#if makeSmall}
    function create_if_block$1(ctx) {
    	let article;
    	let h2;
    	let t1;
    	let br0;
    	let t2;
    	let p;
    	let t3;
    	let a;
    	let t5;
    	let br1;
    	let t6;
    	let br2;
    	let t7;

    	const block = {
    		c: function create() {
    			article = element("article");
    			h2 = element("h2");
    			h2.textContent = "Howdy!";
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			p = element("p");
    			t3 = text("In February 2020, I graduated from the UPenn LPS Coding Bootcamp. Shortly\n        thereafter I started my current job as a web developer at Drexel\n        University, where I work as a front-end developer operating in\n        Sitecore CMS. I'm passionate about quality and accessible design and\n        code. I'm always very interested in learning new things, and in fact this\n        portfolio is the first site I've made using ");
    			a = element("a");
    			a.textContent = "Svelte";
    			t5 = text("! I'm also the proud father of one human being and two cats!\n        ");
    			br1 = element("br");
    			t6 = space();
    			br2 = element("br");
    			t7 = text("\n        This site serves as both a portfolio to demonstrate recent and\n        past work and as a sandbox for me to play in. I've also included a little bit\n        about my past life in cognitive-neuroscience research, because that was neat\n        too.");
    			attr_dev(h2, "class", "svelte-15yjdjg");
    			add_location(h2, file$1, 15, 6, 342);
    			attr_dev(br0, "class", "svelte-15yjdjg");
    			add_location(br0, file$1, 16, 6, 364);
    			attr_dev(a, "href", "https://svelte.dev");
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "class", "svelte-15yjdjg");
    			add_location(a, file$1, 23, 52, 818);
    			attr_dev(br1, "class", "svelte-15yjdjg");
    			add_location(br1, file$1, 27, 8, 971);
    			attr_dev(br2, "class", "svelte-15yjdjg");
    			add_location(br2, file$1, 28, 8, 986);
    			attr_dev(p, "class", "svelte-15yjdjg");
    			add_location(p, file$1, 17, 6, 377);
    			attr_dev(article, "class", "svelte-15yjdjg");
    			add_location(article, file$1, 14, 4, 326);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, h2);
    			append_dev(article, t1);
    			append_dev(article, br0);
    			append_dev(article, t2);
    			append_dev(article, p);
    			append_dev(p, t3);
    			append_dev(p, a);
    			append_dev(p, t5);
    			append_dev(p, br1);
    			append_dev(p, t6);
    			append_dev(p, br2);
    			append_dev(p, t7);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(article);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(14:2) {#if makeSmall}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let link0;
    	let link1;
    	let t;
    	let section;
    	let section_class_value;
    	let if_block = /*makeSmall*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			link0 = element("link");
    			link1 = element("link");
    			t = space();
    			section = element("section");
    			if (if_block) if_block.c();
    			attr_dev(link0, "rel", "preconnect");
    			attr_dev(link0, "href", "https://fonts.gstatic.com");
    			attr_dev(link0, "class", "svelte-15yjdjg");
    			add_location(link0, file$1, 5, 2, 60);
    			attr_dev(link1, "href", "https://fonts.googleapis.com/css2?family=Nunito:wght@200;300;400&display=swap");
    			attr_dev(link1, "rel", "stylesheet");
    			attr_dev(link1, "class", "svelte-15yjdjg");
    			add_location(link1, file$1, 6, 2, 121);
    			attr_dev(section, "class", section_class_value = "" + (null_to_empty(/*makeSmall*/ ctx[0] ? "fadeIn" : null) + " svelte-15yjdjg"));
    			add_location(section, file$1, 12, 0, 258);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link0);
    			append_dev(document.head, link1);
    			insert_dev(target, t, anchor);
    			insert_dev(target, section, anchor);
    			if (if_block) if_block.m(section, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*makeSmall*/ ctx[0]) {
    				if (if_block) ; else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(section, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*makeSmall*/ 1 && section_class_value !== (section_class_value = "" + (null_to_empty(/*makeSmall*/ ctx[0] ? "fadeIn" : null) + " svelte-15yjdjg"))) {
    				attr_dev(section, "class", section_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link0);
    			detach_dev(link1);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(section);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Textblurb", slots, []);
    	let { makeSmall } = $$props;
    	const writable_props = ["makeSmall"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Textblurb> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("makeSmall" in $$props) $$invalidate(0, makeSmall = $$props.makeSmall);
    	};

    	$$self.$capture_state = () => ({ makeSmall });

    	$$self.$inject_state = $$props => {
    		if ("makeSmall" in $$props) $$invalidate(0, makeSmall = $$props.makeSmall);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [makeSmall];
    }

    class Textblurb extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { makeSmall: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Textblurb",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*makeSmall*/ ctx[0] === undefined && !("makeSmall" in props)) {
    			console.warn("<Textblurb> was created without expected prop 'makeSmall'");
    		}
    	}

    	get makeSmall() {
    		throw new Error("<Textblurb>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set makeSmall(value) {
    		throw new Error("<Textblurb>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const PROJECTS = [
      {
        id: "1",
        url: "https://drexel.edu/legacy-center/",
        title: "Drexel University: Legacy Center Archives and Special Collections",
        tech: ["HTML5", "CSS3", "JS", "Sitecore CMS"],
        tasks: "Homepage Redesign, Content Review & some Javascript",
        image: "/assets/Drexel_horizontal_yellow copy.png",
        alt: "Drexel University Logo",
      },
      {
        id: "2",
        url: "https://drexel.edu/hunger-free-center/",
        title: "Drexel University: The Center for Hunger Free Communities",
        tech: ["HTML5", "CSS3", "JS", "Sitecore CMS"],
        tasks:
          "Homepage Redesign & Informational Architecture Restructuring plus some Javascript here and there",
        image: "/assets/Drexel_horizontal_yellow copy.png",
        alt: "Drexel University Logo",
      },
      {
        id: "3",
        url: "https://drexel.edu/disability-resources/",
        title: "Drexel University: Disability Resources",
        tech: ["HTML5", "CSS3", "JS", "Sitecore CMS"],
        tasks: "Homepage Redesign, Content Review and some Javascript",
        image: "/assets/Drexel_horizontal_yellow copy.png",
        alt: "Drexel University Logo",
      },
      {
        id: "4",
        url: "https://github.com/CodeForPhilly/prevention-point",
        title: "Code for Philly: Prevention Point",
        tech: ["React", "MaterialUI", "MobX", "Django", "Jest", "Yup"],
        tasks:
          "Developed new database features with migrations and tests for Django/PostGres backend. Developed tests and validation for frontend components and state management using Yup and Jest.",
        image: "/assets/cfp-logo.png",
        alt: "Code for Philly Logo",
      },
      {
        id: "5",
        url: "https://github.com/maleszewskid/Project-3",
        title: "Patient First",
        tech: ["React", "Node", "Express", "PassportJS"],
        tasks:
          "Built the Node/Express server coupled with a MongoDB database. Defined the ORM, controllers and views. Developed the API and implemented authentication via PassportJS. Did some of the frontend components for data entry and display, specifically the charts using React ChartKick and React Table packages.",
        image: "assets/upenn-logo.png",
        alt: "University of Pennsylvania Logo",
      },
      {
        id: "5",
        url: "https://github.com/JackRyan1989/babyTracker",
        title: "Baby Tracker",
        tech: ["React", "MongoDB Realm", "MaterialUI"],
        tasks:
          "Side project to track my son's movements in the womb, sleeping, eating and pooping habits, along with parent effort. Entirely client-side application complete with user authentication and a MongoDB database courtesy of MongoDB Realm. All styling was done using the Material UI library. Used React Chart JS-2 Package to help with plotting data from MongoDB. Deployed to Github pages.",
        image: "/assets/Github_Logo.png",
        alt: "Github Logo",
      },
    ];

    /* src/components/projects.svelte generated by Svelte v3.32.3 */
    const file$2 = "src/components/projects.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (47:6) {:else}
    function create_else_block(ctx) {
    	let div;
    	let p;
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "Hey something went wrong loading projects!";
    			t1 = space();
    			attr_dev(p, "class", "svelte-u8zlhb");
    			add_location(p, file$2, 48, 10, 1320);
    			attr_dev(div, "class", "svelte-u8zlhb");
    			add_location(div, file$2, 47, 8, 1304);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(div, t1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(47:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (36:18) {#each project.tech as tech}
    function create_each_block_1(ctx) {
    	let li;
    	let t_value = /*tech*/ ctx[3] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			attr_dev(li, "class", "item-category svelte-u8zlhb");
    			add_location(li, file$2, 36, 20, 1027);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(36:18) {#each project.tech as tech}",
    		ctx
    	});

    	return block;
    }

    // (17:6) {#each PROJECTS as project}
    function create_each_block(ctx) {
    	let a;
    	let div5;
    	let div1;
    	let h3;
    	let t0_value = /*project*/ ctx[0].title + "";
    	let t0;
    	let t1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t2;
    	let div4;
    	let div3;
    	let ul;
    	let t3;
    	let div2;
    	let raw_value = /*project*/ ctx[0].tasks + "";
    	let t4;
    	let each_value_1 = /*project*/ ctx[0].tech;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			div5 = element("div");
    			div1 = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			div0 = element("div");
    			img = element("img");
    			t2 = space();
    			div4 = element("div");
    			div3 = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			div2 = element("div");
    			t4 = space();
    			attr_dev(h3, "class", "item-heading svelte-u8zlhb");
    			add_location(h3, file$2, 27, 14, 667);
    			attr_dev(img, "role", "img");
    			if (img.src !== (img_src_value = /*project*/ ctx[0].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*project*/ ctx[0].alt);
    			attr_dev(img, "class", "svelte-u8zlhb");
    			add_location(img, file$2, 29, 16, 763);
    			attr_dev(div0, "class", "image svelte-u8zlhb");
    			add_location(div0, file$2, 28, 14, 727);
    			attr_dev(div1, "class", "title svelte-u8zlhb");
    			add_location(div1, file$2, 26, 12, 633);
    			attr_dev(ul, "class", "svelte-u8zlhb");
    			add_location(ul, file$2, 34, 16, 955);
    			attr_dev(div2, "class", "tasks svelte-u8zlhb");
    			add_location(div2, file$2, 39, 16, 1129);
    			attr_dev(div3, "class", "tags svelte-u8zlhb");
    			add_location(div3, file$2, 33, 14, 920);
    			attr_dev(div4, "class", "tag-tasks-container svelte-u8zlhb");
    			add_location(div4, file$2, 32, 12, 872);
    			attr_dev(div5, "class", "item-content svelte-u8zlhb");
    			add_location(div5, file$2, 25, 10, 594);
    			attr_dev(a, "id", /*project*/ ctx[0].id);
    			attr_dev(a, "role", "link");
    			attr_dev(a, "tabindex", "0");
    			attr_dev(a, "class", "item svelte-u8zlhb");
    			attr_dev(a, "href", /*project*/ ctx[0].url);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$2, 17, 8, 422);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, div5);
    			append_dev(div5, div1);
    			append_dev(div1, h3);
    			append_dev(h3, t0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div5, t2);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			div2.innerHTML = raw_value;
    			append_dev(a, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*PROJECTS*/ 0) {
    				each_value_1 = /*project*/ ctx[0].tech;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(17:6) {#each PROJECTS as project}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let link0;
    	let link1;
    	let t0;
    	let section;
    	let h2;
    	let t2;
    	let article;
    	let div;
    	let each_value = PROJECTS;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block(ctx);
    	}

    	const block = {
    		c: function create() {
    			link0 = element("link");
    			link1 = element("link");
    			t0 = space();
    			section = element("section");
    			h2 = element("h2");
    			h2.textContent = "Projects";
    			t2 = space();
    			article = element("article");
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each_1_else) {
    				each_1_else.c();
    			}

    			attr_dev(link0, "rel", "preconnect");
    			attr_dev(link0, "href", "https://fonts.gstatic.com");
    			attr_dev(link0, "class", "svelte-u8zlhb");
    			add_location(link0, file$2, 5, 2, 84);
    			attr_dev(link1, "href", "https://fonts.googleapis.com/css2?family=Nunito:wght@200;300;400&display=swap");
    			attr_dev(link1, "rel", "stylesheet");
    			attr_dev(link1, "class", "svelte-u8zlhb");
    			add_location(link1, file$2, 6, 2, 145);
    			attr_dev(h2, "class", "svelte-u8zlhb");
    			add_location(h2, file$2, 13, 2, 294);
    			attr_dev(div, "class", "item-grid svelte-u8zlhb");
    			add_location(div, file$2, 15, 4, 356);
    			attr_dev(article, "id", "container");
    			attr_dev(article, "role", "group");
    			attr_dev(article, "class", "svelte-u8zlhb");
    			add_location(article, file$2, 14, 2, 314);
    			attr_dev(section, "class", "svelte-u8zlhb");
    			add_location(section, file$2, 12, 0, 282);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link0);
    			append_dev(document.head, link1);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, section, anchor);
    			append_dev(section, h2);
    			append_dev(section, t2);
    			append_dev(section, article);
    			append_dev(article, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*PROJECTS*/ 0) {
    				each_value = PROJECTS;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;

    				if (each_value.length) {
    					if (each_1_else) {
    						each_1_else.d(1);
    						each_1_else = null;
    					}
    				} else if (!each_1_else) {
    					each_1_else = create_else_block(ctx);
    					each_1_else.c();
    					each_1_else.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link0);
    			detach_dev(link1);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(section);
    			destroy_each(each_blocks, detaching);
    			if (each_1_else) each_1_else.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Projects", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Projects> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ PROJECTS });
    	return [];
    }

    class Projects extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Projects",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/contact.svelte generated by Svelte v3.32.3 */

    const file$3 = "src/components/contact.svelte";

    function create_fragment$3(ctx) {
    	let section;
    	let div0;
    	let h3;
    	let t1;
    	let div1;
    	let a0;
    	let span0;
    	let t3;
    	let a1;
    	let span1;
    	let t5;
    	let a2;
    	let span2;
    	let t7;
    	let a3;
    	let span3;
    	let div1_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Contact Me";
    			t1 = space();
    			div1 = element("div");
    			a0 = element("a");
    			span0 = element("span");
    			span0.textContent = "Email";
    			t3 = space();
    			a1 = element("a");
    			span1 = element("span");
    			span1.textContent = "Github";
    			t5 = space();
    			a2 = element("a");
    			span2 = element("span");
    			span2.textContent = "LinkedIn";
    			t7 = space();
    			a3 = element("a");
    			span3 = element("span");
    			span3.textContent = "Google Scholar";
    			attr_dev(h3, "class", "svelte-1y82jb4");
    			add_location(h3, file$3, 10, 2, 218);
    			attr_dev(div0, "class", "heading-holder svelte-1y82jb4");
    			add_location(div0, file$3, 9, 2, 187);
    			attr_dev(span0, "id", "email");
    			attr_dev(span0, "class", "underline svelte-1y82jb4");
    			add_location(span0, file$3, 18, 7, 477);
    			attr_dev(a0, "role", "link");
    			attr_dev(a0, "aria-labelledby", "email");
    			attr_dev(a0, "tabindex", "0");
    			attr_dev(a0, "href", "mailto:jack.jackryan@protonmail.com");
    			attr_dev(a0, "class", "svelte-1y82jb4");
    			add_location(a0, file$3, 13, 4, 351);
    			attr_dev(span1, "id", "github");
    			attr_dev(span1, "class", "underline svelte-1y82jb4");
    			add_location(span1, file$3, 25, 22, 676);
    			attr_dev(a1, "role", "link");
    			attr_dev(a1, "aria-labelledby", "github");
    			attr_dev(a1, "tabindex", "0");
    			attr_dev(a1, "href", "https://github.com/JackRyan1989");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "class", "svelte-1y82jb4");
    			add_location(a1, file$3, 20, 4, 538);
    			attr_dev(span2, "id", "linkedin");
    			attr_dev(span2, "class", "underline svelte-1y82jb4");
    			add_location(span2, file$3, 32, 22, 892);
    			attr_dev(a2, "role", "link");
    			attr_dev(a2, "aria-labelledby", "linkedin");
    			attr_dev(a2, "tabindex", "0");
    			attr_dev(a2, "href", "https://www.linkedin.com/in/johnanthonyryan/");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "class", "svelte-1y82jb4");
    			add_location(a2, file$3, 27, 4, 739);
    			attr_dev(span3, "id", "googleScholar");
    			attr_dev(span3, "class", "underline svelte-1y82jb4");
    			add_location(span3, file$3, 39, 22, 1256);
    			attr_dev(a3, "role", "link");
    			attr_dev(a3, "aria-labelledby", "googleScholar");
    			attr_dev(a3, "tabindex", "0");
    			attr_dev(a3, "href", "https://scholar.google.com/citations?hl=en&view_op=list_works&gmla=AJsN-F5WdgPu5EfV3xkLLaBPa86b5hQZBhkkO_kKHu9_VlrR1MZT2pefwHXmSkfiZjWMOBSTaNFh1Afxd5y225wzHae1b7Xaew&user=mIzNk1QAAAAJ");
    			attr_dev(a3, "target", "_blank");
    			attr_dev(a3, "class", "svelte-1y82jb4");
    			add_location(a3, file$3, 34, 4, 959);
    			attr_dev(div1, "role", "group");
    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty(/*linkToggle*/ ctx[1] ? "contact-links" : "hide-links") + " svelte-1y82jb4"));
    			add_location(div1, file$3, 12, 2, 275);
    			attr_dev(section, "class", "svelte-1y82jb4");
    			toggle_class(section, "makeSmall", /*makeSmall*/ ctx[0]);
    			add_location(section, file$3, 8, 0, 159);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div0);
    			append_dev(div0, h3);
    			append_dev(section, t1);
    			append_dev(section, div1);
    			append_dev(div1, a0);
    			append_dev(a0, span0);
    			append_dev(div1, t3);
    			append_dev(div1, a1);
    			append_dev(a1, span1);
    			append_dev(div1, t5);
    			append_dev(div1, a2);
    			append_dev(a2, span2);
    			append_dev(div1, t7);
    			append_dev(div1, a3);
    			append_dev(a3, span3);

    			if (!mounted) {
    				dispose = listen_dev(h3, "click", /*displayLinks*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*linkToggle*/ 2 && div1_class_value !== (div1_class_value = "" + (null_to_empty(/*linkToggle*/ ctx[1] ? "contact-links" : "hide-links") + " svelte-1y82jb4"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			if (dirty & /*makeSmall*/ 1) {
    				toggle_class(section, "makeSmall", /*makeSmall*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Contact", slots, []);
    	let { makeSmall } = $$props;
    	let linkToggle = false;

    	function displayLinks() {
    		linkToggle
    		? $$invalidate(1, linkToggle = false)
    		: $$invalidate(1, linkToggle = true);
    	}

    	const writable_props = ["makeSmall"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Contact> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("makeSmall" in $$props) $$invalidate(0, makeSmall = $$props.makeSmall);
    	};

    	$$self.$capture_state = () => ({ makeSmall, linkToggle, displayLinks });

    	$$self.$inject_state = $$props => {
    		if ("makeSmall" in $$props) $$invalidate(0, makeSmall = $$props.makeSmall);
    		if ("linkToggle" in $$props) $$invalidate(1, linkToggle = $$props.linkToggle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [makeSmall, linkToggle, displayLinks];
    }

    class Contact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { makeSmall: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*makeSmall*/ ctx[0] === undefined && !("makeSmall" in props)) {
    			console.warn("<Contact> was created without expected prop 'makeSmall'");
    		}
    	}

    	get makeSmall() {
    		throw new Error("<Contact>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set makeSmall(value) {
    		throw new Error("<Contact>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/nav-links.svelte generated by Svelte v3.32.3 */

    const file$4 = "src/components/nav-links.svelte";

    // (16:23) 
    function create_if_block_1(ctx) {
    	let button;
    	let h3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			h3 = element("h3");
    			h3.textContent = "Projects";
    			attr_dev(h3, "id", "projectsLink");
    			attr_dev(h3, "class", "underline svelte-uki92b");
    			add_location(h3, file$4, 21, 9, 603);
    			attr_dev(button, "role", "navigation");
    			attr_dev(button, "aria-labelledby", "projectsLink");
    			attr_dev(button, "tabindex", "0");
    			attr_dev(button, "class", "svelte-uki92b");
    			add_location(button, file$4, 16, 6, 445);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, h3);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(16:23) ",
    		ctx
    	});

    	return block;
    }

    // (8:4) {#if !setAbout}
    function create_if_block$2(ctx) {
    	let button;
    	let h3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			h3 = element("h3");
    			h3.textContent = "About";
    			attr_dev(h3, "id", "aboutLink");
    			attr_dev(h3, "class", "underline svelte-uki92b");
    			add_location(h3, file$4, 13, 9, 351);
    			attr_dev(button, "role", "navigation");
    			attr_dev(button, "aria-labelledby", "aboutLink");
    			attr_dev(button, "tabindex", "0");
    			attr_dev(button, "class", "svelte-uki92b");
    			add_location(button, file$4, 8, 6, 199);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, h3);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(8:4) {#if !setAbout}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let div_class_value;

    	function select_block_type(ctx, dirty) {
    		if (!/*setAbout*/ ctx[1]) return create_if_block$2;
    		if (/*setAbout*/ ctx[1]) return create_if_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(/*makeSmall*/ ctx[0] ? "links" : "no-links") + " svelte-uki92b"));
    			toggle_class(div, "makeSmall", /*makeSmall*/ ctx[0]);
    			add_location(div, file$4, 6, 0, 110);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}

    			if (dirty & /*makeSmall*/ 1 && div_class_value !== (div_class_value = "" + (null_to_empty(/*makeSmall*/ ctx[0] ? "links" : "no-links") + " svelte-uki92b"))) {
    				attr_dev(div, "class", div_class_value);
    			}

    			if (dirty & /*makeSmall, makeSmall*/ 1) {
    				toggle_class(div, "makeSmall", /*makeSmall*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			if (if_block) {
    				if_block.d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Nav_links", slots, []);
    	let { makeSmall } = $$props;
    	let { setAbout } = $$props;

    	let { onClickChangeView = () => {
    		
    	} } = $$props;

    	const writable_props = ["makeSmall", "setAbout", "onClickChangeView"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav_links> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => onClickChangeView("about");
    	const click_handler_1 = () => onClickChangeView("projects");

    	$$self.$$set = $$props => {
    		if ("makeSmall" in $$props) $$invalidate(0, makeSmall = $$props.makeSmall);
    		if ("setAbout" in $$props) $$invalidate(1, setAbout = $$props.setAbout);
    		if ("onClickChangeView" in $$props) $$invalidate(2, onClickChangeView = $$props.onClickChangeView);
    	};

    	$$self.$capture_state = () => ({ makeSmall, setAbout, onClickChangeView });

    	$$self.$inject_state = $$props => {
    		if ("makeSmall" in $$props) $$invalidate(0, makeSmall = $$props.makeSmall);
    		if ("setAbout" in $$props) $$invalidate(1, setAbout = $$props.setAbout);
    		if ("onClickChangeView" in $$props) $$invalidate(2, onClickChangeView = $$props.onClickChangeView);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [makeSmall, setAbout, onClickChangeView, click_handler, click_handler_1];
    }

    class Nav_links extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			makeSmall: 0,
    			setAbout: 1,
    			onClickChangeView: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav_links",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*makeSmall*/ ctx[0] === undefined && !("makeSmall" in props)) {
    			console.warn("<Nav_links> was created without expected prop 'makeSmall'");
    		}

    		if (/*setAbout*/ ctx[1] === undefined && !("setAbout" in props)) {
    			console.warn("<Nav_links> was created without expected prop 'setAbout'");
    		}
    	}

    	get makeSmall() {
    		throw new Error("<Nav_links>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set makeSmall(value) {
    		throw new Error("<Nav_links>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setAbout() {
    		throw new Error("<Nav_links>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set setAbout(value) {
    		throw new Error("<Nav_links>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onClickChangeView() {
    		throw new Error("<Nav_links>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onClickChangeView(value) {
    		throw new Error("<Nav_links>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.32.3 */
    const file$5 = "src/App.svelte";

    // (50:28) 
    function create_if_block_1$1(ctx) {
    	let section;
    	let projects;
    	let current;
    	projects = new Projects({ $$inline: true });

    	const block = {
    		c: function create() {
    			section = element("section");
    			create_component(projects.$$.fragment);
    			attr_dev(section, "name", "projects");
    			attr_dev(section, "id", "second");
    			attr_dev(section, "class", "svelte-19e18ga");
    			add_location(section, file$5, 50, 8, 1318);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			mount_component(projects, section, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(projects.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(projects.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(projects);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(50:28) ",
    		ctx
    	});

    	return block;
    }

    // (46:6) {#if setAbout}
    function create_if_block$3(ctx) {
    	let section;
    	let text_1;
    	let current;

    	text_1 = new Textblurb({
    			props: { makeSmall: /*makeSmall*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			section = element("section");
    			create_component(text_1.$$.fragment);
    			attr_dev(section, "name", "text");
    			attr_dev(section, "id", "first");
    			attr_dev(section, "class", "svelte-19e18ga");
    			add_location(section, file$5, 46, 8, 1198);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			mount_component(text_1, section, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const text_1_changes = {};
    			if (dirty & /*makeSmall*/ 1) text_1_changes.makeSmall = /*makeSmall*/ ctx[0];
    			text_1.$set(text_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(text_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(text_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(46:6) {#if setAbout}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div2;
    	let div0;
    	let header;
    	let t0;
    	let div1;
    	let navlinks;
    	let t1;
    	let contact;
    	let t2;
    	let main;
    	let current_block_type_index;
    	let if_block;
    	let current;

    	header = new Header({
    			props: {
    				makeSmall: /*makeSmall*/ ctx[0],
    				mediaWidth: /*mediaWidth*/ ctx[3]
    			},
    			$$inline: true
    		});

    	navlinks = new Nav_links({
    			props: {
    				makeSmall: /*makeSmall*/ ctx[0],
    				onClickChangeView: /*onClickChangeView*/ ctx[4],
    				setAbout: /*setAbout*/ ctx[2]
    			},
    			$$inline: true
    		});

    	contact = new Contact({
    			props: { makeSmall: /*makeSmall*/ ctx[0] },
    			$$inline: true
    		});

    	const if_block_creators = [create_if_block$3, create_if_block_1$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*setAbout*/ ctx[2]) return 0;
    		if (/*setProjects*/ ctx[1]) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			create_component(header.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(navlinks.$$.fragment);
    			t1 = space();
    			create_component(contact.$$.fragment);
    			t2 = space();
    			main = element("main");
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "header svelte-19e18ga");
    			add_location(div0, file$5, 37, 2, 933);
    			attr_dev(div1, "class", "sidebar svelte-19e18ga");
    			add_location(div1, file$5, 40, 4, 1006);
    			attr_dev(main, "class", "content svelte-19e18ga");
    			attr_dev(main, "role", "main");
    			add_location(main, file$5, 44, 4, 1134);
    			attr_dev(div2, "class", "wrapper svelte-19e18ga");
    			add_location(div2, file$5, 36, 0, 909);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			mount_component(header, div0, null);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			mount_component(navlinks, div1, null);
    			append_dev(div1, t1);
    			mount_component(contact, div1, null);
    			append_dev(div2, t2);
    			append_dev(div2, main);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(main, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const header_changes = {};
    			if (dirty & /*makeSmall*/ 1) header_changes.makeSmall = /*makeSmall*/ ctx[0];
    			header.$set(header_changes);
    			const navlinks_changes = {};
    			if (dirty & /*makeSmall*/ 1) navlinks_changes.makeSmall = /*makeSmall*/ ctx[0];
    			if (dirty & /*setAbout*/ 4) navlinks_changes.setAbout = /*setAbout*/ ctx[2];
    			navlinks.$set(navlinks_changes);
    			const contact_changes = {};
    			if (dirty & /*makeSmall*/ 1) contact_changes.makeSmall = /*makeSmall*/ ctx[0];
    			contact.$set(contact_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(main, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(navlinks.$$.fragment, local);
    			transition_in(contact.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(navlinks.$$.fragment, local);
    			transition_out(contact.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(header);
    			destroy_component(navlinks);
    			destroy_component(contact);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let makeSmall = false;
    	let setProjects = false;
    	let setAbout = true;
    	let mediaWidth = window.innerWidth;

    	const delayedTextShrink = function () {
    		$$invalidate(0, makeSmall = true);
    	};

    	onMount(() => {
    		let timer = setTimeout(
    			() => {
    				delayedTextShrink();
    			},
    			1500
    		);

    		return () => clearTimeout(timer);
    	});

    	const onClickChangeView = function (setView) {
    		switch (setView) {
    			case "about":
    				$$invalidate(2, setAbout = true);
    				$$invalidate(1, setProjects = false);
    				break;
    			case "projects":
    				$$invalidate(2, setAbout = false);
    				$$invalidate(1, setProjects = true);
    				break;
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Header,
    		Text: Textblurb,
    		Projects,
    		Contact,
    		Navlinks: Nav_links,
    		onMount,
    		makeSmall,
    		setProjects,
    		setAbout,
    		mediaWidth,
    		delayedTextShrink,
    		onClickChangeView
    	});

    	$$self.$inject_state = $$props => {
    		if ("makeSmall" in $$props) $$invalidate(0, makeSmall = $$props.makeSmall);
    		if ("setProjects" in $$props) $$invalidate(1, setProjects = $$props.setProjects);
    		if ("setAbout" in $$props) $$invalidate(2, setAbout = $$props.setAbout);
    		if ("mediaWidth" in $$props) $$invalidate(3, mediaWidth = $$props.mediaWidth);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [makeSmall, setProjects, setAbout, mediaWidth, onClickChangeView];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
