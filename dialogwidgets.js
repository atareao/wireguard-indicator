#!/usr/bin/env gjs

const {GObject, Gtk} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Extension.uuid);
const _ = Gettext.gettext;

var EntryDialog = GObject.registerClass(
    class EntryDialog extends Gtk.Dialog{
        _init(text1, text2){
            super._init();
            let grid = new Gtk.Grid();
            grid.set_row_spacing(5);
            grid.set_column_spacing(5);
            grid.set_margin_start(5);
            grid.set_margin_end(5);
            grid.set_margin_top(5);
            grid.set_margin_bottom(5);
            this.get_content_area().add(grid);

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
            this.show_all();
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
