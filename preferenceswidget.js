/*
 * This file is common file for helping to create apps and extenssions
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

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const {Gdk, GdkPixbuf, Gio, GLib, GObject, Gtk} = imports.gi;
const Gettext = imports.gettext.domain(Extension.metadata['gettext-domain']);
const _ = Gettext.gettext;

const DialogWidgets = Extension.imports.dialogwidgets;

var ShortcutSetting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.ShortcutSetting').replace(/[\W_]+/g,'_')
    },
    class ShortcutSetting extends Gtk.Box{
        _init(settings, keyName, params={}) {
            super._init();

            let shortcut = settings.get_value(keyName).deep_unpack();

            let model = new Gtk.ListStore();
            model.set_column_types([GObject.TYPE_STRING]);
            let [_, key, mods] = Gtk.accelerator_parse(shortcut[0]);
            model.set(model.insert(0), [0], [Gtk.accelerator_get_label(key, mods)]);

            let tree = new Gtk.TreeView({ model: model, headers_visible: false });

            let acc = new Gtk.CellRendererAccel({
                editable: true,
                accel_mode: Gtk.CellRendererAccelMode.GTK
            });
            let column = new Gtk.TreeViewColumn();
            column.pack_start(acc, false);
            column.add_attribute(acc, 'text', 0);
            tree.append_column(column);


            acc.connect('accel-edited', (acce, iter, key, mods) => {
                if(key){
                    let name = Gtk.accelerator_name(key, mods);
                    let [, iterator] = model.get_iter_from_string(iter);
                    model.set(iterator, [0], [Gtk.accelerator_get_label(key, mods)]);
                    settings.set_value(
                        keyName,
                        new GLib.Variant("as", [name])
                    );
                }
            });
            this.append(tree);
        }
    }
);

var ColorSetting = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.ColorSetting').replace(/[\W_]+/g,'_')
    },
    class ColorSetting extends Gtk.ColorButton{
        _init(settings, keyName, params={}) {
            super._init({
                can_focus: true,
                width_request: 132,
                height_request: 32,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                marginEnd: 12,
                useAlpha: true,
                visible: true
            });
            this._colorParse = new Gdk.RGBA();
            this._colorParse.parse(settings.get_value(keyName).deep_unpack());
            this.set_rgba(this._colorParse);

            this.connect('color-set', ()=>{
                const string_color = this.get_rgba().to_string();
                settings.set_value(
                    keyName,
                    new GLib.Variant("s", string_color)
                );
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
                marginEnd: 12,
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

        _init(settings, keyName, lower, upper, digits) {
            super._init({
                climb_rate: 1.0,
                digits: (digits) ? 2 : 0,
                //snap_to_ticks: true,
                //input_purpose: Gtk.InputPurpose.NUMBER,
                can_focus: true,
                width_request: 160,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
                visible: true
            });

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

var ArrayKeyValueSetting = GObject.registerClass(
    {
        GTypeName: Extension.uuid.replace(/[\W_]+/g, '_') + 'ArrayKeyValueSetting',
        Signals: {
            'edit': {param_types: [GObject.TYPE_INT]},
            'remove': {param_types: [GObject.TYPE_INT]},
        },
    },
    class ArrayKeyValueSetting extends Gtk.Frame{
        _init(settings, keyName, keyLabel, valueLabel, params){
            super._init(params);
            this._keyName = keyName;
            this._settings = settings;
            this._keyLabel = keyLabel;
            this._valueLabel = valueLabel;
            this._list = new Gtk.ListBox({
                can_focus: true,
                hexpand: true,
                activate_on_single_click: true,
                selectionMode: Gtk.SelectionMode.NONE,
            });
            this._numberOfChildren = 0;
            this.set_child(this._list);
            //this._list.set_header_func(this._header_func);
            this._load();
        }
        _header_func(row, before){
            if (before) {
                row.set_header(
                    new Gtk.Separator({
                        orientation: Gtk.Orientation.HORIZONTAL,
                    })
                );
            }
        }
        _load(){
            this.removeAllRows();
            const items = this._settings.get_strv(this._keyName);
            for(let i=0; i < items.length; i++){
                const [key, value] = items[i].split("|");
                this.addRow(key, value);
            }
            this.updateSettings();
        }
        removeRow(row){
            if(row){
                this._list.remove(row);
                this._numberOfChildren--;
            }
        }
        updateSettings(){
            this._settings.set_strv(this._keyName, this.getSettings());
        }
        getSettings(){
            const values = [];
            for(let i = this._numberOfChildren - 1; i >= 0; i--){
                const row = this._list.get_row_at_index(i);
                const entry = row.getKey() + "|" + row.getValue();
                values.push(entry);
            }
            return values;
        }
        getValues(){
            const values = [];
            for(let i = this._numberOfChildren - 1; i >= 0; i--){
                const row = this._list.get_row_at_index(i);
                values.push(row.getValue());
            }
            return values;
        }
        removeAllRows(){
            const numberOfRows = this._list.length;
            for(const i = numberOfRows - 1; i >= 0; i--){
                const child = this._list.get_row_at_index(i);
                this.removeRow(child);
            }
            this._list.show();
        }
        addRow(key, value){
            if(this.getValues().includes(value)){
                return null
            }
            const frameRow = new KeyValueFrameRow(
                this._keyLabel, this._valueLabel, key, value);
            frameRow.connect("remove", ()=>{
                this.removeRow(frameRow)
                this.updateSettings();
            });
            frameRow.connect("edit", ()=>{
                const dialog = new DialogWidgets.KeyValueDialog(
                    this, _("Edit"), this._keyLabel, this._valueLabel);
                dialog.setKey(frameRow.getKey());
                dialog.setValue(frameRow.getValue());
                dialog.connect("response", (widget, response_id)=>{
                    const new_name = dialog.getKey();
                    const new_service = dialog.getValue();
                    if(response_id == Gtk.ResponseType.OK){
                        frameRow.setKey(new_name);
                        frameRow.setValue(new_service);
                        this.updateSettings();
                    }
                    dialog.hide();
                    dialog.destroy();
                });
                dialog.show();
            });
            this._list.append(frameRow);
            this._numberOfChildren++;
            return frameRow;
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
                //expand: true,
                model: model
            });

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
                'list-add-symbolic');
            button_add.connect('clicked', () =>{
                let dialog = new DialogWidgets.KeyValueDialog(_(
                    'Name'), _('Service'));
                if (dialog.run() == Gtk.ResponseType.OK){
                    let new_name = dialog.getKey();
                    let new_service = dialog.getValue();
                    let new_entry = new_name + "|" + new_service;
                    if(!this.get_values().includes(new_entry)){
                        model.set(model.append(), [0, 1], [new_name, new_service]);
                    }
                }
                dialog.hide();
                dialog.destroy();
            });
            buttons_box.attach(button_add, 0, 0, 1, 1);
            let button_remove = Gtk.Button.new_from_icon_name(
                'list-remove-symbolic');
            button_remove.connect('clicked', () => {
                let [isselected, liststore, iter] = this._tunnels.get_selection().get_selected();
                if(isselected === true){
                    liststore.remove(iter);
                }
            });
            buttons_box.attach(button_remove, 0, 1, 1, 1);
            let button_edit = Gtk.Button.new_from_icon_name(
                'document-edit-symbolic');
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
                values.push(new_entry);
                exists = model.iter_next(iter);
            }
            return values;
        }

        _on_model_changed(){
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
 * Interesting classes for widgets similar to Gnome Control Center
 */
var Row = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.Row').replace(/[\W_]+/g, '_')
    },
    class Row extends Gtk.ListBoxRow{

        _init(params={}) {
            params = Object.assign({
                activatable: false,
                can_focus: true,
                selectable: false,
                height_request: 48,
                marginStart: 12,
                marginTop: 8,
                marginBottom: 8,
                marginEnd: 12,
            }, params);

            super._init({
                can_focus: params.can_focus,
                activatable: params.activatable,
                selectable: params.selectable,
                height_request: params.height_request
            });

            this.grid = new Gtk.Grid({
                can_focus: true,
                column_spacing: 12,
                marginStart: params.marginStart,
                marginTop: params.marginTop,
                marginBottom: params.marginBottom,
                marginEnd: params.marginEnd,
                vexpand: true,
                valign: Gtk.Align.FILL
            });
            this.set_child(this.grid);
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
                can_focus: true,
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
                can_focus: true,
                hexpand: true,
                activate_on_single_click: true,
                selection_mode: Gtk.SelectionMode.NONE,
            });
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
            if (!row) { row = new FrameRow(params);}
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
                let lower;
                let upper;
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
                widget = new NumberSetting(settings, keyName, lower, upper);
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
        addWidgetSetting(settings, keyName, widget){
            let key = settings.settings_schema.get_key(keyName);
            return this.addSetting(
                key.get_summary(),
                key.get_description(),
                widget
            );
        }
        addWidget(labelText, widget){
            const row = new FrameRow();
            row.addWidget(labelText, widget);
            this._list.append(row);
            return row;
        }
    }
);

var KeyValueFrameRow = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.KeyValueFrameRow').replace(/[\W_]+/g, '_'),
        Signals: {
            'edit': {param_types: [GObject.TYPE_OBJECT]},
            'remove': {param_types: [GObject.TYPE_OBJECT]},
        },
    },
    class KeyValueFrameRow extends Gtk.ListBoxRow{
        _init(keyLabel, valueLabel, key, value, params){
            super._init(params);
            this._grid = new Gtk.Grid({
                orientation: Gtk.Orientation.HORIZONTAL,
                marginTop: 5,
                marginBottom: 5,
                marginStart: 5,
                marginEnd: 5,
                column_spacing: 20,
                row_spacing: 10,
                rowHomogeneous: true
            });
            const editPopover = new Gtk.Popover();
            const editPopoverBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
            });
            editPopover.set_child(editPopoverBox);

            this.editButton = new Gtk.Button({
                label: _("Edit"),
                hasFrame: false,
            });
            this.editButton.connect('clicked', ()=>{
                editPopover.popdown();
                this.emit('edit', this);
            });
            editPopoverBox.append(this.editButton);

            const removeButton = new Gtk.Button({
                label: _("Remove"),
                hasFrame: false,
            });
            removeButton.connect('clicked', ()=>{
                editPopover.popdown();
                this.emit('remove', this);
            });
            editPopoverBox.append(removeButton);

            Gtk.ListBoxRow.prototype.set_child.call(this, this._grid);
            this._grid.attach(new Gtk.Label({
                label: keyLabel,
                halign: Gtk.Align.START,
            }), 0, 0, 1, 1);
            this._keyEntry = new Gtk.Entry({
                text: key,
            });
            this._grid.attach(this._keyEntry, 1, 0, 1, 1);
            this._grid.attach(new Gtk.Label({
                label: valueLabel,
                halign: Gtk.Align.START,
            }), 2, 0, 1, 1);
            this._valueEntry = new Gtk.Entry({
                text: value,
            });
            this._grid.attach(this._valueEntry, 3, 0, 1, 1);
            const menuEditButton = new Gtk.MenuButton({
                iconName: 'view-more-symbolic',
                popover: editPopover,
                hexpand: true,
                vexpand: false,
                halign: Gtk.Align.END,
                valign: Gtk.Align.CENTER,
            });
            this._grid.attach(menuEditButton, 4, 0, 1, 1);
        }
        getValue(){
            return this._valueEntry.get_text();
        }
        setValue(value){
            return this._valueEntry.set_text(value);
        }
        getKey(){
            return this._keyEntry.get_text();
        }
        setKey(key){
            return this._keyEntry.set_text(key);
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
                marginTop: 5,
                marginBottom: 5,
                marginStart: 5,
                marginEnd: 5,
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
                label: (value?value:""),
                hexpand: true,
                sensitive: false,
                halign: Gtk.Align.END
            });
            this.add(valueLabel);
        }

        addWidget(labelText, button){
            const label = new Gtk.Label({
                label: labelText
            });
            this.add(label);
            this.add(button);
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
                can_focus: true,
                marginStart: 24,
                marginEnd: 24,
                marginTop: 32,
                marginBottom: 32,
                orientation: Gtk.Orientation.VERTICAL
            });
            this.set_child(this._mainBox);
        }
        addLabel(text){
            if(typeof text === "string"){
                let label = new Gtk.Label({
                    marginTop: 5,
                    marginBottom: 5,
                    can_focus: false,
                    use_markup: true,
                    label: text
                });
                this._mainBox.append(label);
            } else if (text instanceof Gtk.Widget) {
                this._mainBox.append(text);
            }
        }
        addGlobalImage(iconName, pixelSize){
            const imageBox = new Gtk.Image({
                marginTop: 15,
                marginBottom: 15,
                iconName: iconName,
                pixelSize: pixelSize,
                vexpand: false
            });
            this._mainBox.append(imageBox);
        }
        addLocalImage(iconName, pixelSize){
            const baseIcon = Extension.path + '/icons/' + iconName;
            const fileIcon = Gio.File.new_for_path(baseIcon + '.png')
            if(fileIcon.query_exists(null) == false){
                fileIcon = Gio.File.new_for_path(baseIcon + '.svg')
            }
            if(fileIcon.query_exists(null)){
                const picture = new Gtk.Image({
                    marginTop: 15,
                    marginBottom: 15,
                    file: fileIcon.get_path(),
                    pixelSize: pixelSize,
                    vexpand: false
                });
                this._mainBox.append(picture);
            }
        }
        addLinkButton(iconName, pixelSize, uri, tooltip){
            const baseIcon = Extension.path + '/icons/' + iconName;
            let fileIcon = Gio.File.new_for_path(baseIcon + '.png')
            if(fileIcon.query_exists(null) == false){
                fileIcon = Gio.File.new_for_path(baseIcon + '.svg')
            }
            if(fileIcon.query_exists(null)){
                const picture = new Gtk.Image({
                    marginTop: 15,
                    marginBottom: 15,
                    file: fileIcon.get_path(),
                    pixelSize: pixelSize,
                    vexpand: false
                });
                const linkButton = new Gtk.LinkButton({
                    hexpand: false,
                    vexpand: false,
                    valign: Gtk.Align.CENTER,
                    halign: Gtk.Align.CENTER,
                    child: picture,
                    uri: uri,
                    tooltip_text: tooltip
                });
                this._mainBox.append(linkButton);
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
                    can_focus: true,
                    marginBottom: 12,
                    marginStart: 3,
                    xalign: 0,
                    use_markup: true,
                    label: "<b>" + title + "</b>"
                });
                //this._mainBox.pack_start(label, false, true, 0);
                this._mainBox.append(label);
            } else if (typeof title === "string" && title == "") {
                let label = new Gtk.Label({
                    canFocus: false,
                    marginTop: 20,
                });
                this._mainBox.append(label);
            } else if (title instanceof Gtk.Widget) {
                this._mainBox.append(title);
            }
            if(frame == null){
                const frame = new Frame();
                this._mainBox.append(frame);
                return frame;
            }
            this._mainBox.append(frame);
            return frame;
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
                marginTop: 5,
                marginBottom: 5,
                marginStart: 5,
                marginEnd: 5,
                spacing: 10,
                homogeneous: false
            });
            this._title = new Gtk.Label({
                label: "<b>" + title + "</b>",
                use_markup: true,
                halign: Gtk.Align.START
            });
        }

        appendLabel(text){
            const label = new Gtk.Label({
                marginTop: 5,
                marginBottom: 5,
                can_focus: false,
                use_markup: true,
                label: text
            });
            this.append(label);
        }

        appendImageWithLabel(iconName, pixelSize, text){
            const box = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                marginTop: 5,
                marginBottom: 5,
                marginStart: 5,
                marginEnd: 5,
                spacing: 10,
                homogeneous: false,
                halign: Gtk.Align.CENTER
            });
            const baseIcon = Extension.path + '/icons/' + iconName;
            let fileIcon = Gio.File.new_for_path(baseIcon + '.png')
            if(fileIcon.query_exists(null) == false){
                fileIcon = Gio.File.new_for_path(baseIcon + '.svg')
            }
            if(fileIcon.query_exists(null)){
                const picture = new Gtk.Image({
                    file: fileIcon.get_path(),
                    pixelSize: pixelSize,
                    vexpand: false
                });
                box.append(picture);
            }

            const label = new Gtk.Label({
                can_focus: false,
                use_markup: true,
                label: text
            });
            box.append(label);
            this.append(box);
        }

        getTitleLabel() {
            return this._title;
        }
    }
);

var StackListBox = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.StackListBox').replace(/[\W_]+/g, '_')
    },
    class StackListBox extends Gtk.ListBox{
        _init(widget, params){
            super._init(params);
            this.valign = Gtk.Align.FILL;
            this.vexpand = true;
            this.hexpand = false;
            this.settingsFrameStack = widget.settingsFrameStack;
            this.settingsListStack = widget.settingsListStack
            this.connect("row-selected", (self, row) => {
                if(row){
                    let stackName = row.stackName;
                    this.settingsFrameStack.set_visible_child_name(stackName);
                    if(row.nextPage){
                        if(widget.backButton.get_parent()){
                            widget.leftHeaderBox.remove(widget.backButton);
                        }
                        widget.leftHeaderBox.prepend(widget.backButton);
                        this.settingsListStack.set_visible_child_name(
                            row.nextPage);
                        this.settingsListStack.get_child_by_name(
                            row.nextPage).listBox.selectFirstRow();
                    }
                }
            });
            this.scrollWindow =  new Gtk.ScrolledWindow({
                valign: Gtk.Align.FILL,
                vexpand: true
            });
            this.scrollWindow.set_policy(Gtk.PolicyType.NEVER,
                                         Gtk.PolicyType.AUTOMATIC);
            this.scrollWindow.set_child(this);
            this.scrollWindow.listBox = this;
        }

        getRowAtIndex(index){
            return this.get_row_at_index(index).get_children()[0];
        }

        getSelectedRow(){
            return this.get_selected_row().get_children()[0];
        }

        selectFirstRow(){
            this.select_row(this.get_row_at_index(0));
        }

        selectRowAtIndex(index){
            this.select_row(this.get_row_at_index(index));
        }

        addRow(name, translateableName, iconName){
            let row1 = new Gtk.ListBoxRow();
            this.append(row1);

            let row = new Gtk.Grid({
                marginTop: 12,
                marginBottom: 12,
                marginStart: 12,
                marginEnd: 12,
                column_spacing: 10
            });
            row1.set_child(row);
            row1.stackName = name;
            row1.translateableName = translateableName;

            let image = new Gtk.Image({
                icon_name: iconName
            });

            let label = new Gtk.Label({
                label: translateableName,
                halign: Gtk.Align.START,
            });
            row.attach(image, 0, 0, 1, 1);
            row.attach(label, 1, 0, 1, 1);

            if(nextPage){
                row1.nextPage = nextPage;
                let image2 = new Gtk.Image({
                    gicon: Gio.icon_new_for_string('go-next-symbolic'),
                    halign: Gtk.Align.END,
                    hexpand: true
                });
                row.attach(image2, 2, 0, 1, 1);
            }
        }

        setSeparatorIndices(indexArray){
            this.set_header_func((_row, _before) =>{
                for(let i = 0; i < indexArray.length; i++){
                    if(_row.get_index() === indexArray[i]){
                        let sep = Gtk.Separator.new(Gtk.Orientation.HORIZONTAL);
                        sep.show();
                        _row.set_header(sep);

                    }
                }
            });
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

var ListWithStack = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.ListWithStack').replace(/[\W_]+/g, '_')
    },
    class ListWithStack extends Gtk.Box {
        _init(params){
            params = Object.assign({
                orientation: Gtk.Orientation.HORIZONTAL,
                homogeneous: false
            }, params);
            super._init(params);
            const scrolledListWindow = new Gtk.ScrolledWindow({
                valign: Gtk.Align.FILL,
                vexpand: true,
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                vscrollbar_policy: Gtk.PolicyType.AUTOMATIC
            });
            this.append(scrolledListWindow);
            this._list = new Gtk.ListBox({
                widthRequest: 215,
                valign: Gtk.Align.FILL,
                vexpand: true,
                hexpand: false
            });
            this._list.connect("row-selected", (self, row)=>{
                this._stack.set_visible_child_name(row.stackName);
            });
            scrolledListWindow.set_child(this._list);
            const scrolledStackWindow = new Gtk.ScrolledWindow({
                valign: Gtk.Align.FILL,
                vexpand: true,
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                vscrollbar_policy: Gtk.PolicyType.AUTOMATIC
            });
            this.append(scrolledStackWindow);
            this._stack = new Stack({
                hexpand: true,
                vexpand: true
            });
            scrolledStackWindow.set_child(this._stack);
        }
        add(labelText, iconName, page){
            const listBoxRow = new Gtk.ListBoxRow();
            this._list.append(listBoxRow);
            const box = new Gtk.Box({
                orientation:Gtk.Orientation.HORIZONTAL,
                margin_top: 12,
                margin_bottom: 12,
                margin_start: 12,
                margin_end: 12,
                spacing: 10
            });
            listBoxRow.set_child(box);
            listBoxRow.stackName = labelText.replace(/[\W_]+/g, '_');
            let image = new Gtk.Image({
                iconName: iconName,
                iconSize: Gtk.IconSize.NORMAL
            })
            box.append(image);
            let label = new Gtk.Label({
                label: labelText,
                halign: Gtk.Align.START
            });
            box.append(label);
            this._stack.add_named(page, listBoxRow.stackName);
        }
    }
);
