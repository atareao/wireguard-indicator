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

String.format = imports.format.format;

const {Gdk, GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
imports.searchPath.push(".");
const Extension = {"uuid": "test"};


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

var ArrayStringSetting = GObject.registerClass(
    {
        GTypeName: Extension.uuid.replace(/[\W_]+/g, '_') + '_ArrayStringSetting'
    },
    class ArrayStringSetting extends Gtk.Grid{
        _init(settings, keyName){
            super._init({
                can_focus: true,
                visible: true
            });
            this._keyName = keyName;
            this._settings = settings;
            let model = new Gtk.ListStore();
            model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING]);
            let items = settings.get_strv(keyName);
            for(let i=0; i < items.length; i++){
                let [name, service] = items[i].split("|");
                model.set(model.append(), [0, 1], [name, service]);
            }
            this._tunnels = new Gtk.TreeView({
                expand: true,
                model: model});

            let col1 = new Gtk.TreeViewColumn({title: _('Name')});
            let cell1 = new Gtk.CellRendererText();
            col1.pack_start(cell1, true);
            col1.add_attribute(cell1, "text", 0);
            this._tunnels.insert_column(col1, 0);

            let col2 = new Gtk.TreeViewColumn({title: _('Service')});
            let cell2 = new Gtk.CellRendererText();
            col2.pack_start(cell2, true);
            col2.add_attribute(cell2, "text", 1);
            this._tunnels.insert_column(col2, 1);

            this.attach(this._tunnels, 0, 0, 1, 1);
            let buttons_box = Gtk.Grid.new();
            let button_add = Gtk.Button.new_from_icon_name(
                'list-add-symbolic', Gtk.IconSize.BUTTON);
            button_add.connect('clicked', () =>{
                let dialog = new DialogWidgets.EntryDialog(_(
                    'Name'), _('Service'));
                if (dialog.run() == Gtk.ResponseType.OK){
                    let new_name = dialog.getEntry1();
                    let new_service = dialog.getEntry2();
                    let new_entry = new_name + "|" + new_service;
                    log(new_entry);
                    if(!this.get_values().includes(new_entry)){
                        model.set(model.append(), [0, 1], [new_name, new_service]);
                    }
                }
                dialog.hide();
                dialog.destroy();
            });
            buttons_box.attach(button_add, 0, 0, 1, 1);
            let button_remove = Gtk.Button.new_from_icon_name(
                'list-remove-symbolic', Gtk.IconSize.BUTTON);
            button_remove.connect('clicked', () => {
                let [isselected, liststore, iter] = this._tunnels.get_selection().get_selected();
                if(isselected === true){
                    liststore.remove(iter);
                }
            });
            buttons_box.attach(button_remove, 0, 1, 1, 1);
            let button_edit = Gtk.Button.new_from_icon_name(
                'document-edit-symbolic', Gtk.IconSize.BUTTON);
            button_edit.connect('clicked', () => {
                let [isselected, liststore, iter] = this._tunnels.get_selection().get_selected();
                if(isselected === true){
                    let name = liststore.get_value(iter, 0);
                    let service = liststore.get_value(iter, 1);
                    let dialog = new DialogWidgets.EntryDialog(_('Name'), _('Service'));
                    dialog.setEntry1(name);
                    dialog.setEntry2(service);
                    if(dialog.run() == Gtk.ResponseType.OK){
                        name = dialog.getEntry1();
                        service = dialog.getEntry2();
                        let new_value = name + "|" + service;
                        if(!this.get_values().includes(new_value)){
                            liststore.set_value(iter, 0, name);
                            liststore.set_value(iter, 1, service);
                        }
                    }
                    dialog.hide();
                    dialog.destroy();
                }
            });
            buttons_box.attach(button_edit, 0, 3, 1, 1);
            this.attach(buttons_box, 1, 0, 1, 1);

            model.connect('row-changed', this._on_model_changed.bind(this));
            model.connect('row-deleted', this._on_model_changed.bind(this));
            model.connect('row-inserted', this._on_model_changed.bind(this));
        }
        get_values(){
            let values = [];
            let model = this._tunnels.get_model();
            let [exists, iter] = model.get_iter_first();
            while(exists){
                let new_name = model.get_value(iter, 0);
                let new_service = model.get_value(iter, 1);
                let new_entry = new_name + "|" + new_service;
                log(new_entry);
                values.push(new_entry);
                exists = model.iter_next(iter);
            }
            return values;
        }

        _on_model_changed(){
            log("=== Model Changed ===");
            this._settings.set_strv(this._keyName, this.get_values());
            this.get_toplevel().set_focus(null);
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
    class FolderSetting extends Gtk.FileChooserWidget{

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

var Frame = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.Frame').replace(/[\W_]+/g, '_')
    },
    class Frame extends Gtk.Frame{
        _init(params){
            super._init(params);
            this._list = new Gtk.ListBox({
                can_focus: false,
                hexpand: true,
                activate_on_single_click: true,
                selection_mode: Gtk.SelectionMode.NONE,
            });
            // Gtk.Frame.prototype.set_child.call(this, this._list);
            this.set_child(this._list);
            this._list.set_header_func(this._header_func);
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
            this._list.append(row);
            return row;
        }

        addLabelRow(key, value, params={}){
            const row = new FrameRow(params);
            row.addLabel(key, value);
            this._list.append(row);
            return row;
        }

        insertRow(row, position){
            this._list.insert(row, position);
        }

        removeRow(row){
            if(row){
                this._list.remove(row);
            }
        }

        show(){
            this._list.show();
        }

        length(){
            return this._list.length;
        }

        removeAllRows(){
            const numberOfRows = this._list.length;
            for(const i = numberOfRows - 1; i >= 0; i--){
                const child = this._list.get_row_at_index(i);
                if(child){
                    this.removeRow(child);
                }
            }
            this._list.show();
        }

        getIndex(index){
            return this._list.get_row_at_index(index);
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
            } else if (type === "as") {
                widget = new ArrayStringSetting(settings, keyName);
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

var FrameRow = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.FrameRow').replace(/[\W_]+/g, '_')
    },
    class FrameRow extends Gtk.ListBoxRow{
        _init(params){
            super._init(params);
            this.activatable = false;
            this._grid = new Gtk.Grid({
                orientation: Gtk.Orientation.HORIZONTAL,
                margin_top: 5,
                margin_bottom: 5,
                margin_start: 5,
                margin_end: 5,
                column_spacing: 20,
                row_spacing: 20
            });
            this._numberOfChildren = 0;
            Gtk.ListBoxRow.prototype.set_child.call(this, this._grid);
        }

        add(widget) {
            this._grid.attach(widget, this._numberOfChildren, 0, 1, 1);
            this._numberOfChildren++;
        }
        addLabel(key, value){
            const keyLabel = new Gtk.Label({
                label: key
            });
            this.add(keyLabel);
            const valueLabel =new Gtk.Label({
                label: value,
                hexpand: true,
                sensitive: false,
                halign: Gtk.Align.END
            });
            this.add(valueLabel);
        }
        
        setVerticalAlignmentBottom(){
            this._grid.vexpand = true;
            this._grid.valign = Gtk.Align.END;
        }
    }
);

/** A composite widget resembling A Gnome Control Center panel. */
var Page = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.Page').replace(/[\W_]+/g, '_')
    },
    class Page extends Gtk.ScrolledWindow{
        _init(){
            super._init({
                can_focus: true,
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
                valign: Gtk.Align.FILL,
                vexpand: true,
            });
            this._mainBox = new Gtk.Box({
                can_focus: false,
                margin_start: 24,
                margin_end: 24,
                margin_top: 32,
                margin_bottom: 32,
                orientation: Gtk.Orientation.VERTICAL
            });
            log(this._mainBox);
            this.set_child(this._mainBox);
        }
        addLabel(text){
            if(typeof text === "string"){
                let label = new Gtk.Label({
                    margin_top: 5,
                    margin_bottom: 5,
                    can_focus: false,
                    use_markup: true,
                    label: text
                });
                this._mainBox.append(label);
            } else if (text instanceof Gtk.Widget) {
                this._mainBox.append(text);
            }
        }
        addImage(image, size){
            if(typeof image === "string"){
                const imageBox = new Gtk.Image({
                    margin_top: 15,
                    margin_bottom: 15,
                    icon_name: image,
                    pixel_size: size
                });
                this._mainBox.append(imageBox);
            }else if(typeof image === Gtk.Image){
                this._mainBox.append(image);
            }
        }
        addWidget(widget){
            this._mainBox.append(widget);
        }

        /**
         * Add and return a new section widget. If @title is given, a bold title
         * will be placed above the section.
         *
         * @param {string|Gtk.Widget} [title] - Optional title for the section
         * @param {Frame} [section] - The section to add, or null to create new
         * @return {Gtk.Frame} section - The new Frame object.
         */
        addFrame(title, frame){
            if (typeof title === "string" && title != "") {
                let label = new Gtk.Label({
                    can_focus: false,
                    margin_bottom: 12,
                    margin_start: 3,
                    xalign: 0,
                    use_markup: true,
                    label: "<b>" + title + "</b>"
                });
                //this._mainBox.pack_start(label, false, true, 0);
                log(this._mainBox);
                this._mainBox.append(label);
            } else if (title instanceof Gtk.Widget) {
                this._mainBox.append(title);
            } 

            this._mainBox.append(frame);
            return frame;
        }
    }
);

var StackListBox = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.StackListBox').replace(/[\W_]+/g, '_')
    },
    class StackListBox extends Gtk.ListBox{

    }
)


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

var Notebook = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.Notebook').replace(/[\W_]+/g, '_')
    },
    class Notebook extends Gtk.Notebook{
        _init(){
            super._init({
                marginStart:5,
                marginEnd: 5
            });
        }

        append_page(notebookPage){
            Gtk.Notebook.prototype.append_page.call(
                this,
                notebookPage,
                notebookPage.getTitleLabel()
            )
        }
    }
);

var NotebookPage = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.NotebookPage').replace(/[\W_]+/g, '_')
    },
    class NotebookPage extends Gtk.Box {
        _init(title) {
            super._init({
                orientation: Gtk.Orientation.VERTICAL,
                margin_top: 20,
                margin_bottom: 20,
                margin_start: 20,
                margin_end: 20,
                spacing: 20,
                homogeneous: false
            });
            this._title = new Gtk.Label({
                label: "<b>" + title + "</b>",
                use_markup: true,
                halign: Gtk.Align.START
            });
        }

        getTitleLabel() {
            return this._title;
        }
    }
);

var Button = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.Button').replace(/[\W_]+/g, '_')
    },
    class Button extends Gtk.Button {
        _init(params) {
            super._init();
            this._params = params;
            this.halign = Gtk.Align.END;
            this.valign = Gtk.Align.CENTER;
            this.box = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 5
            });
            this.set_child(this.box);

            if (this._params.icon_name) {
                let image = new Gtk.Image({
                    icon_name: this._params.icon_name,
                    halign: Gtk.Align.CENTER
                });
                this.box.append(image);
            }
            if (this._params.tooltip_text){
                this.set_tooltip_text(this._params.tooltip_text);
            }
            if (this._params.title){
                let label = new Gtk.Label({
                    label: _(this._params.title),
                    use_markup: true,
                    xalign: 0
                });
                if(this._params.icon_first)
                    this.box.append(label);
                else
                    this.box.prepend(label);
            }
        }
    }
);


var EntryDialog = GObject.registerClass(
    class EntryDialog extends Gtk.Dialog{
        _init(parent, title, text1, text2){
            super._init({
                title: title,
                transient_for: parent.get_root(),
                modal: true
            });
            let grid = new Gtk.Grid({
                rowSpacing: 5,
                columnSpacing: 5,
                marginTop: 5,
                marginBottom: 5,
                marginStart: 5,
                marginEnd:5,
                hexpand: false,
                halign: Gtk.Align.CENTER
            });
            grid.insert_after(this.get_content_area(), null);

            let label1 = Gtk.Label.new(text1);
            grid.attach(label1, 0, 0, 1, 1);
            this._entry1 = new Gtk.Entry();
            grid.attach(this._entry1, 1, 0, 1, 1);

            let label2 = Gtk.Label.new(text2);
            grid.attach(label2, 0, 1, 1, 1);
            this._entry2 = new Gtk.Entry();
            grid.attach(this._entry2, 1, 1, 1, 1);

            this.add_button(_('Cancel'), Gtk.ResponseType.CANCEL);
            this.add_button(_('Ok'), Gtk.ResponseType.OK);
        }

        getEntry1(){
            return this._entry1.get_text();
        }
        setEntry1(entry1){
            this._entry1.set_text(entry1);
        }
        getEntry2(){
            return this._entry2.get_text();
        }
        setEntry2(entry2){
            this._entry2.set_text(entry2);
        }
    }
);
