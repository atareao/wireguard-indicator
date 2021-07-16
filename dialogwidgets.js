#!/usr/bin/env gjs

const {GObject, Gtk} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Gettext = imports.gettext.domain(Extension.uuid);
const _ = Gettext.gettext;

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
