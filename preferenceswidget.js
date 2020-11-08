/*
 * This file is part of wireguard-indicator
 *
 * Copyright (c) 2020 Lorenzo Carbonell Cerezo <a.k.a. atareao>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

imports.gi.versions.Gdk = "3.0";
imports.gi.versions.Gio = "2.0";
imports.gi.versions.GLib = "2.0";
imports.gi.versions.GObject = "2.0";
imports.gi.versions.Gtk = "3.0";

const {Gdk, Gio, GLib, GObject, Gtk} = imports.gi

String.format = imports.format.format;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Extension.uuid);
const _ = Gettext.gettext;


var ColorSetting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.ColorSetting').replace(/[\W_]+/g,'_')
    },
    class ColorSetting extends Gtk.Button{
        _init(settings, keyName, params={}) {
            super._init({
                can_focus: true,
                width_request: 132,
                height_request: 32,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                margin_right: 12,
                visible: true
            });
            let string_color = settings.get_value(keyName).deep_unpack();
            this.background_color = new Gdk.RGBA();
            this.background_color.parse(string_color);

            this.drawingArea = new Gtk.DrawingArea();
            this.drawingArea.connect('draw', (widget, cr)=>{
                cr.setSourceRGBA(this.background_color.red,
                                 this.background_color.green,
                                 this.background_color.blue,
                                 this.background_color.alpha);
                cr.rectangle(0,
                             0,
                             this.get_allocated_width(),
                             this.get_allocated_height());
                cr.fill();
            });
            this.add(this.drawingArea);

            this.connect('clicked', ()=>{
                let color_dialog = new Gtk.ColorChooserDialog();
                color_dialog.set_rgba(this.background_color);
                if(color_dialog.run() == Gtk.ResponseType.OK){
                    this.background_color = color_dialog.get_rgba();
                    settings.set_value(
                        keyName,
                        new GLib.Variant("s", this.background_color.to_string())
                    );
                    this.drawingArea.queue_draw();
                }
                color_dialog.destroy();
            });
        }
    }
);

/** A Gtk.Switch subclass for boolean GSettings. */
var BoolSetting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.BoolSetting').replace(/[\W_]+/g,'_')
    },
    class BoolSetting extends Gtk.Switch{
        _init(settings, keyName) {
            super._init({
                can_focus: true,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                visible: true
            });
            settings.bind(keyName, this, "active", Gio.SettingsBindFlags.DEFAULT);
        }
    }
);

/** A Gtk.ComboBoxText subclass for GSetting choices and enumerations */
var EnumSetting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.EnumSetting').replace(/[\W_]+/g, '_')
    },
    class EnumSetting extends Gtk.ComboBoxText{

        _init(settings, keyName) {
            super._init({
                can_focus: true,
                width_request: 160,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                expand: true,
                visible: true
            });

            let key = settings.settings_schema.get_key(keyName);
            let enums = key.get_range().deep_unpack()[1].deep_unpack();

            enums.forEach((enum_nick) => {
                this.append(enum_nick, _(enum_nick)); // TODO: better
            });

            this.active_id = settings.get_string(keyName);

            settings.bind(
                keyName,
                this,
                "active-id",
                Gio.SettingsBindFlags.DEFAULT
            );
        }
    }
);

/** A Gtk.MenuButton subclass for GSetting flags */
var FlagsSetting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.FlagsSetting').replace(/[\W_]+/g, '_')
    },
    class FlagsSetting extends Gtk.MenuButton{
        _init(settings, keyName, params={}) {
            if (!params.icon) {
                params.icon = new Gtk.Image({
                    icon_name: "checkbox-checked-symbolic",
                    pixel_size: 16
                });
            }

            super._init({
                image: params.icon,
                can_focus: true,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                popover: new Gtk.Popover(),
                visible: true
            });
            this.get_style_context().add_class("circular");

            this.box = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin: 8
            });
            this.popover.add(this.box);

            let flag;
            let key = settings.settings_schema.get_key(keyName);
            let flags = key.get_range().deep_unpack()[1].deep_unpack();
            let old_flags = settings.get_value(keyName).deep_unpack();

            flags.forEach((flagNick) => {
                flag = new Gtk.CheckButton({
                    label: _(flagNick),
                    active: (old_flags.indexOf(flagNick) > -1)
                });

                flag.connect("toggled", (button) => {
                    let new_flags = settings.get_value(keyName).deep_unpack();

                    if (button.active) {
                        new_flags.push(flagNick);
                    } else {
                        new_flags.splice(new_flags.indexOf(flagNick), 1);
                    }

                    settings.set_value(keyName, new GLib.Variant("as", new_flags));
                });

                this.box.add(flag);
            });
        }
    }
);

/** A Gtk.Button/Popover subclass for GSetting nullable booleans (maybe) */
var MaybeSetting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.MaybeSetting').replace(/[\W_]+/g, '_')
    },
    class MaybeSetting extends Gtk.Button{

        _init(settings, keyName) {
            super._init({
                can_focus: true,
                width_request: 120,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                margin_right: 12,
                visible: true
            });

            this.popover = new Gtk.Popover({ relative_to: this });

            this.box = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin: 8,
                visible: true
            });
            this.popover.add(this.box);

            let nothingButton = new Gtk.RadioButton({
                label: _("Nothing"),
                active: false,
                visible: true
            });
            nothingButton.connect("toggled", (button) => {
                if (button.active) {
                    settings.set_value(keyName, new GLib.Variant("mb", null));
                    this.label = button.label;
                }
            });
            this.box.add(nothingButton);

            let trueButton = new Gtk.RadioButton({
                label: _("True"),
                visible: true
            });
            trueButton.join_group(nothingButton);
            trueButton.connect("toggled", (button) => {
                if (button.active) {
                    settings.set_value(keyName, new GLib.Variant("mb", true));
                    this.label = button.label;
                }
            });
            this.box.add(trueButton);

            let falseButton = new Gtk.RadioButton({
                label: _("False"),
                visible: true
            });
            falseButton.join_group(nothingButton);
            falseButton.connect("toggled", (button) => {
                if (button.active) {
                    settings.set_value(keyName, new GLib.Variant("mb", false));
                    this.label = button.label;
                }
            });
            this.box.add(falseButton);

            this.connect("clicked", () => { this.popover.show_all(); });

            let val = Settings.get_value(keyName).deep_unpack();

            if (val === true) {
                trueButton.active = true;
                this.label = trueButton.label;
            } else if (val === false) {
                falseButton.active = true;
                this.label = falseButton.label;
            } else {
                nothingButton.active = true;
                this.label = nothingButton.label;
            }
        }
    }
);

/** A Gtk.SpinButton subclass for unranged integer GSettings */
var NumberSetting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.NumberSetting').replace(/[\W_]+/g, '_')
    },
    class NumberSetting extends Gtk.SpinButton{

        _init(settings, keyName, type) {
            super._init({
                climb_rate: 1.0,
                digits: (type === "d") ? 2 : 0,
                //snap_to_ticks: true,
                input_purpose: Gtk.InputPurpose.NUMBER,
                can_focus: true,
                width_request: 160,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                visible: true
            });

            let lower, upper;

            // FIXME: definitely not working
            if (type === "y") {
                [lower, upper] = [0, 255];
            } else if (type === "q") {
                [lower, upper] = [0, GLib.MAXUINT16];
            } else if (type === "n") {
                [lower, upper] = [GLib.MININT16, GLib.MAXINT16];
            } else if (type === "i" || type === "h") {
                [lower, upper] = [GLib.MININT32, GLib.MAXINT32];
            } else if (type === "u") {
                [lower, upper] = [0, GLib.MAXUINT32];
            } else if (type === "x") {
                throw TypeError("Can't map 64 bit numbers");
                [lower, upper] = [GLib.MININT64, GLib.MAXINT64];
            } else if (type === "t") {
                throw TypeError("Can't map 64 bit numbers");
                [lower, upper] = [0, GLib.MAXUINT64];
            // TODO: not sure this is working
            } else if (type === "d") {
                [lower, upper] = [2.3E-308, 1.7E+308];
            }

            this.adjustment = new Gtk.Adjustment({
                lower: lower,
                upper: upper,
                step_increment: 1
            });

            settings.bind(
                keyName,
                this.adjustment,
                "value",
                Gio.SettingsBindFlags.DEFAULT
            );
        }
    }
);

/** A Gtk.Scale subclass for ranged integer GSettings */
var RangeSetting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.RangeSetting').replace(/[\W_]+/g, '_')
    },
    class RangeSetting extends Gtk.Scale{

        _init(settings, keyName) {
            super._init({
                orientation: Gtk.Orientation.HORIZONTAL,
                draw_value: false,
                can_focus: true,
                width_request: 160,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                expand: true,
                visible: true
            });

            let key = settings.settings_schema.get_key(keyName);
            let [lower, upper] = key.get_range().deep_unpack()[1].deep_unpack();

            this.adjustment = new Gtk.Adjustment({
                lower: lower,
                upper: upper,
                step_increment: 1
            });

            settings.bind(
                setting,
                this.adjustment,
                "value",
                Gio.SettingsBindFlags.DEFAULT
            );
        }
    }
);

/** A Gtk.Entry subclass for string GSettings */
var StringSetting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.StringSetting').replace(/[\W_]+/g, '_')
    },
    class StringSetting extends Gtk.Entry{

        _init(settings, keyName) {
            super._init({
                can_focus: true,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                text: settings.get_string(keyName),
                width_chars: 16,
                visible: true
            });

            this.connect("activate", (entry) => {
                if (entry.text !== settings.get_string(keyName)) {
                    settings.set_string(keyName, entry.text);
                    entry.secondary_icon_name = "";
                }
                this.get_toplevel().set_focus(null);
            });

            this.connect("changed", (entry) => {
                if (entry.text !== settings.get_string(keyName)) {
                    entry.secondary_icon_name = "emblem-ok-symbolic";
                    settings.set_string(keyName, entry.text);
                }
            });

            this.connect("icon-release", (entry) => {
                if (entry.text !== settings.get_string(keyName)) {
                    settings.set_string(keyName, entry.text);
                    entry.secondary_icon_name = "";
                }
                this.get_toplevel().set_focus(null);
            });

            this.connect("key-press-event", (entry, event, user_data) => {
                if (event.get_keyval()[1] === Gdk.KEY_Escape) {
                    entry.text = settings.get_string(keyName);
                    entry.secondary_icon_name = "";
                    this.get_toplevel().set_focus(null);
                }
            });
        }
    }
);

/** A Gtk.FileChooserButton subclass for folder GSettings */
var FolderSetting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.FolderSetting').replace(/[\W_]+/g, '_')
    },
    class FolderSetting extends Gtk.FileChooserButton{

        _init(settings, keyName) {
            super._init({
                action: Gtk.FileChooserAction.SELECT_FOLDER,
                can_focus: true,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                visible: true
            });

            this.set_filename(settings.get_string(keyName));
            this.connect("file-set", (button) => {
                settings.set_string(keyName, this.get_filename());
            });
        }
    }
);

/** A Gtk.Entry subclass for all other GSettings */
var OtherSetting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.OtherSetting').replace(/[\W_]+/g, '_')
    },
    class OtherSetting extends Gtk.Entry{

        _init(settings, keyName) {
            super._init({
                text: settings.get_value(keyName).deep_unpack().toSource(),
                can_focus: true,
                width_request: 160,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                expand: true,
                visible: true
            });

            this.keyName = keyName;
            this._type = settings.settings_schema.get_key(keyName).get_value_type().dup_string();

            settings.connect("changed::" + this._setting, () => {
                this.text = settings.get_value(keyName).deep_unpack().toSource();
            });

            this.connect("notify::text", (entry) => {
                let styleContext = entry.get_style_context();

                try {
                    let variant = new GLib.Variant(entry._type, eval(entry.text));
                    settings.set_value(entry._setting, variant);

                    if (styleContext.has_class("error")) {
                        styleContext.remove_class("error");
                    }
                } catch (e) {
                    if (!styleContext.has_class("error")) {
                        styleContext.add_class("error");
                    }
                }
            });
        }
    }
);

/**
 * Convenience classes for widgets similar to Gnome Control Center
 */
var Row = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.Row').replace(/[\W_]+/g, '_')
    },
    class Row extends Gtk.ListBoxRow{

        _init(params={}) {
            params = Object.assign({
                activatable: false,
                can_focus: false,
                selectable: false,
                height_request: 48,
                margin_left: 12,
                margin_top: 8,
                margin_bottom: 8,
                margin_right: 12,
            }, params);

            super._init({
                can_focus: params.can_focus,
                activatable: params.activatable,
                selectable: params.selectable,
                height_request: params.height_request
            });

            this.grid = new Gtk.Grid({
                can_focus: false,
                column_spacing: 12,
                margin_left: params.margin_left,
                margin_top: params.margin_top,
                margin_bottom: params.margin_bottom,
                margin_right: params.margin_right,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
            this.add(this.grid);
        }
    }
);

var Setting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.Setting').replace(/[\W_]+/g, '_')
    },
    class Setting extends Row{

        _init(summary, description, widget) {
            super._init({ height_request: 56 });

            this.summary = new Gtk.Label({
                can_focus: false,
                xalign: 0,
                hexpand: true,
                valign: Gtk.Align.CENTER,
                vexpand: true,
                label: summary,
                use_markup: true
            });
            this.grid.attach(this.summary, 0, 0, 1, 1);
            if (description) {
                this.description = new Gtk.Label({
                    xalign: 0,
                    hexpand: true,
                    valign: Gtk.Align.CENTER,
                    vexpand: true,
                    label: description,
                    use_markup: true,
                    wrap: true
                });
                this.description.get_style_context().add_class("dim-label");
                this.grid.attach(this.description, 0, 1, 1, 1);
            }
            this.grid.attach(widget, 1, 0, 1, (description) ? 2 : 1);
        }
    }
);

var Section = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.Section').replace(/[\W_]+/g, '_')
    },
    class Section extends Gtk.Frame{
        _init(params={}){
            params = Object.assign({
                width_request: 460,
                selection_mode: Gtk.SelectionMode.NONE,
                margin_bottom: 32
            }, params);
            super._init({
                can_focus: false,
                margin_bottom: params.margin_bottom,
                hexpand: true,
                shadow_type: Gtk.ShadowType.IN
            });
            this.list = new Gtk.ListBox({
                can_focus: false,
                hexpand: true,
                activate_on_single_click: true,
                selection_mode: params.selection_mode,
                width_request: params.width_request
            });
            this.add(this.list);
            this.list.set_header_func(this._header_func);
        }

        _header_func(row, before){
            if (before) {
                row.set_header(
                    new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL })
                );
            }
        }
        /**
         * Add and return new row with a Gtk.Grid child
         *
         * @param {Gtk.ListBoxRow|Row} [row] - The row to add, null to create new
         * @return {Gtk.ListBoxRow} row - The new row
         */
        addRow(row, params={}) {
            if (!row) { row = new Row(params);}
            this.list.add(row);
            return row;
        }

        /**
         * Add a new row to @section and return the row. @summary will be placed on
         * top of @description (dimmed) on the left, @widget to the right of them.
         *
         * @param {String} summary - A short summary for the item
         * @param {String} description - A short description for the item
         * @return {Gtk.ListBoxRow} row - The new row
         */
        addSetting(summary, description, widget) {
            let setting = new Setting(summary, description, widget);
            let row = this.addRow(setting);
            return row;
        }

        /**
         * Add a new row to @section, populated from the Schema for @settings and
         * the key @keyName. A Gtk.Widget will be chosen for @keyName based on it's
         * type, unless @widget is given which will have @settings and @keyName
         * passed to its constructor.
         *
         * @param {String} keyName - The GSettings key name
         * @param {Gtk.Widget} widget - An override widget
         * @return {Gtk.ListBoxRow} row - The new row
         */
        addGSetting(settings, keyName, widget) {
            let key = settings.settings_schema.get_key(keyName);
            let range = key.get_range().deep_unpack()[0];
            let type = key.get_value_type().dup_string();
            type = (range !== "type") ? range : type;

            if (widget !== undefined) {
                widget = new widget(settings, keyName);
            } else if (type === "b") {
                widget = new BoolSetting(settings, keyName);
            } else if (type === "enum") {
                widget = new EnumSetting(settings, keyName);
            } else if (type === "flags") {
                widget = new FlagsSetting(settings, keyName);
            } else if (type === "mb") {
                widget = new MaybeSetting(settings, keyName);
            } else if (type.length === 1 && "ynqiuxthd".indexOf(type) > -1) {
                widget = new NumberSetting(settings, keyName, type);
            } else if (type === "range") {
                widget = new RangeSetting(settings, keyName);
            } else if (type.length === 1 && "sog".indexOf(type) > -1) {
                widget = new StringSetting(settings, keyName);
            } else {
                widget = new OtherSetting(settings, keyName);
            }

            return this.addSetting(
                key.get_summary(),
                key.get_description(),
                widget
            );
        }
    }
);


/** A composite widget resembling A Gnome Control Center panel. */
var Page = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.Page').replace(/[\W_]+/g, '_')
    },
    class Page extends Gtk.ScrolledWindow{
        _init(params={}){
            params = Object.assign({
                can_focus: true,
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                valign: Gtk.Align.FILL,
                vexpand: true,
            }, params);
            super._init(params);
            this.box = new Gtk.Box({
                can_focus: false,
                margin_left: 72,
                margin_right: 72,
                margin_top: 32,
                margin_bottom: 32,
                orientation: Gtk.Orientation.VERTICAL
            });
            this.add(this.box);
        }

        /**
         * Add and return a new section widget. If @title is given, a bold title
         * will be placed above the section.
         *
         * @param {string|Gtk.Widget} [title] - Optional title for the section
         * @param {Section} [section] - The section to add, or null to create new
         * @return {Gtk.Frame} section - The new Section object.
         */
        addSection(title, section, params={}){
            if (typeof title === "string") {
                let label = new Gtk.Label({
                    can_focus: false,
                    margin_bottom: 12,
                    margin_start: 3,
                    xalign: 0,
                    use_markup: true,
                    label: "<b>" + title + "</b>"
                });
                this.box.pack_start(label, false, true, 0);
            } else if (title instanceof Gtk.Widget) {
                this.box.pack_start(title, false, true, 0);
            }

            if (!section) { section = new Section(params); }
            this.box.add(section);
            return section;
        }
    }
);


/** A GtkStack subclass with a pre-attached GtkStackSwitcher */
var Stack = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.Stack').replace(/[\W_]+/g, '_')
    },
    class Stack extends Gtk.Stack{
        _init(params={}){
            params = Object.assign({
                transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT
            }, params);
            super._init(params);
            this.switcher = new Gtk.StackSwitcher({
                halign: Gtk.Align.CENTER,
                stack: this
            });
            this.switcher.show_all();
        }

        addPage(id, title, params={}){
            let page = new Page(params);
            this.add_titled(page, id, title);
            return page;
        }

        removePage(id){
            let page = this.get_child_by_name(id);
            this.remove(page);
            page.destroy();
        }
    }
);
