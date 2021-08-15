#!/usr/bin/env gjs

imports.gi.versions.GObject = "2.0"
imports.gi.versions.Gtk = "4.0"
imports.gi.versions.Gdk = "4.0"

const {Gtk, GLib, GObject, GdkPixbuf} = imports.gi;
imports.searchPath.push(".");
const Widgets = imports.testwidgets;
Gtk.init(); 


const Dialog = GObject.registerClass(
    class Dialog extends Gtk.Dialog{
        _init(){
            super._init({
                defaultWidth: 300,
                defaultHeight: 300
            });
            this.add_button("Aceptar", Gtk.ResponseType.OK);
            this.add_button("Cancelar", Gtk.ResponseType.CANCEL);
            this._createUI();

        }
        _createUI(){
            const mainBox = new Widgets.ListWithStack({});
            mainBox.insert_after(this.get_content_area(), null);
            mainBox.add("Ayuda", 'system-settings-symbolic', new AboutPage());
            mainBox.add("Ayuda 2", 'system-settings-symbolic', new AboutPage());
            mainBox.add("Ayuda 3", 'system-settings-symbolic', new AboutPage());
        }
        _createUI2(){

            const mainBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                homogeneous: false
            });
            mainBox.insert_after(this.get_content_area(), null);
            const scrolledOptionWindow = new Gtk.ScrolledWindow({
                valign: Gtk.Align.FILL,
                vexpand: true
            });
            mainBox.append(scrolledOptionWindow);
            scrolledOptionWindow.set_policy(Gtk.PolicyType.NEVER,
                                      Gtk.PolicyType.AUTOMATIC);

            const lista = new Gtk.ListBox({
                width_request: 215,
                valign: Gtk.Align.FILL,
                vexpand: true,
                hexpand: false
            });
            lista.addRow = (stackName, labelText, iconName)=>{
                const listBoxRow = new Gtk.ListBoxRow();
                lista.append(listBoxRow);
                const box = new Gtk.Box({
                    orientation:Gtk.Orientation.HORIZONTAL,
                    margin_top: 12,
                    margin_bottom: 12,
                    margin_start: 12,
                    margin_end: 12,
                    spacing: 10
                });
                listBoxRow.set_child(box);
                listBoxRow.stackName = stackName;
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
            };
            lista.connect("row-selected", (self, row) =>{
                log("selected");
                log(row.stackName);
                this.stack.set_visible_child_name(row.stackName);
            });
            lista.addRow('Fila 1', 'Fila 1', 'system-settings-symbolic');
            scrolledOptionWindow.set_child(lista);
            lista.addRow('Fila 2', 'Fila 2', 'system-settings-symbolic');
            scrolledOptionWindow.set_child(lista);
            lista.addRow('Ayuda', 'Ayuda', 'system-settings-symbolic');
            scrolledOptionWindow.set_child(lista);

            const scrolledStackWindow = new Gtk.ScrolledWindow({
                valign: Gtk.Align.FILL,
                vexpand: true
            });
            mainBox.append(scrolledStackWindow);
            scrolledStackWindow.set_policy(Gtk.PolicyType.NEVER,
                                           Gtk.PolicyType.AUTOMATIC);

            this.stack = new Widgets.Stack({
                hexpand: true,
                vexpand: true
            });
            scrolledStackWindow.set_child(this.stack);
            for(let i=0; i<4; i++){
                const label = new Gtk.Label({
                    label: "Stack Content on Page " + i
                });
                const name = "Fila " + i;
                const title = "Page " + i;
                this.stack.add_titled(label, name, title);
            }
            this.stack.add_named(new AboutPage(), "Ayuda");


        }
    }
);

const AboutPage = GObject.registerClass(
    class AboutPage extends Widgets.Page{
        _init(){
            super._init();
            const info = new Widgets.Frame();
            let extensionVersion;
            let gnomeVersion;
            let osInfoText;
            let prettyName;
            let versionID;
            let buildID;
            let windowLabel;
            this.addImage('system-settings-symbolic', 100);
            this.addLabel('<span size="large"><b>Mi aplicación</b></span>');
            this.addLabel("Una aplicación de ejemplo");
            try{
                extensionVersion = Extension.metadata.version;
            }catch(error){
                extensionVersion = "";
                log(error);
            }
            try{
                gnomeVersion = imports.misc.config.PACKAGE_VERSION;
            }catch(error){
                gnomeVersion ="";
                log(error);
            }
            if((prettyName = GLib.get_os_info("PRETTY_NAME"))){
                osInfoText = prettyName;
            }else{
                osInfoText = GLib.get_os_info("NAME");
            }
            if((versionID = GLib.get_os_info("VERSION_ID"))){
                osInfoText += `; Version ID: ${versionID}`;
            }
            if((buildID = GLib.get_os_info("BUILD_ID"))){
                osInfoText += `; Build ID: ${buildID}`;
            }
            try{
                if(Extension.metadata.isWayland){
                    windowLabel = "Wayland";
                }else{
                    windowLabel = "X11";
                }
            }catch(error){
                log(error);
                windowLabel = "Unknown";
            }
            info.addLabelRow("Extension Version", extensionVersion);
            info.addLabelRow("GNOME Version", gnomeVersion);
            info.addLabelRow("OS", osInfoText);
            info.addLabelRow("Session", windowLabel);
            this.addFrame("Información", info);

            const creditsScrolledWindow = new Gtk.ScrolledWindow({
                marginTop: 10,
                maxContentHeight: 200,
                minContentHeight: 200,
            });
            this.addFrame(null, creditsScrolledWindow);
            const credits = new Widgets.Notebook();
            creditsScrolledWindow.set_child(credits);

            const developersNotebookPage = new Widgets.NotebookPage(
                "Developers"
            );
            developersNotebookPage.append(new Gtk.Label({
                label: "<b>Lorenzo Carbonell</b> a.k.a <a href=\"https://atareao.es\">@atareao</a>",
                use_markup: true,
                halign: Gtk.Align.START,
                hexpand: false,
                vexpand: true
            }));
            credits.append_page(developersNotebookPage);

            const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(
                '/home/lorenzo/Descargas/bmc-button.svg', 150, 50);
            const donateImage = Gtk.Picture.new_for_pixbuf(pixbuf);
            const donateLinkButton = new Gtk.LinkButton({
                hexpand: false,
                vexpand: false,
                valign: Gtk.Align.CENTER,
                halign: Gtk.Align.CENTER,
                child: donateImage,
                uri: 'https://www.buymeacoffee.com/atareao',
                tooltip_text: 'Invítame a un café'
            });
            this.addWidget(donateLinkButton);

        }
    }
);

const mainloop = new GLib.MainLoop(null, null);
const dialog = new Dialog();
dialog.connect("response", (widget, response)=>{
    log("Respuesta");
    log(response);
    mainloop.quit();
});
dialog.show();
mainloop.run();
