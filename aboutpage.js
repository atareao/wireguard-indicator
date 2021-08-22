#!/usr/bin/env gjs

/*
 * Copyright (c) 2021 Lorenzo Carbonell <a.k.a. atareao>
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

const {Gtk, GLib, GObject, GdkPixbuf, Gio} = imports.gi;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const Widgets = Extension.imports.preferenceswidget;
const Gettext = imports.gettext.domain(Extension.metadata['gettext-domain']);
const _ = Gettext.gettext;

var AboutPage = GObject.registerClass(
    {
        GTypeName: (Extension.uuid + '.AboutPage').replace(/[\W_]+/g,'_')
    },
    class AboutPage extends Widgets.Page{
        _init(){
            super._init();
            this.addLocalImage(Extension.metadata.icon, 100);
            const appName = Extension.metadata.name;
            this.addLabel(`<span size="large"><b>${appName}</b></span>`);
            this.addLabel(Extension.metadata.description);

            this.addFrame(null, this._getInfoFrame());
            this.addFrame(null, this._getInfoNotebook());
            this.addLinkButton("bmc-button", 150,
                               "https://www.buymeacoffee.com/atareao",
                               _("Buy me a coffee"));
        }

        _getInfoFrame(){
            const info = new Widgets.Frame();
            info.addLabelRow(Extension.metadata.name + " " + _('Version'),
                             Extension.metadata.version.toString());
            info.addLabelRow(_("GNOME Version"),
                             imports.misc.config.PACKAGE_VERSION.toString());
            info.addLabelRow(_("OS"), this._getOS());
            info.addLabelRow(_("SessionType"), this._getSessionType());
            return info;
        }
        _getInfoNotebook(){
            const infoScrolledWindow = new Gtk.ScrolledWindow({
                marginTop: 10,
                maxContentHeight: 250,
                minContentHeight: 250,
                vexpand: false,
            });
            const notebook = new Widgets.Notebook();
            infoScrolledWindow.set_child(notebook);
            notebook.append_page(this._getDevelopersPage());
            notebook.append_page(this._getContributorsPage());
            notebook.append_page(this._getSupportersPage());
            notebook.append_page(this._getLicensePage());
            notebook.append_page(this._getDoing());
            return infoScrolledWindow;
        }
        _getNotebookPage(title, content){
            const page = new Widgets.NotebookPage(title);
            const label = new Gtk.Label({
                label: content,
                use_markup: true,
                halign: Gtk.Align.START,
                hexpand: false,
                vexpand: false
            });
            page.append(label);
            return page;
        }
        _getDevelopersPage(){
            const title = _("Developers");
            const content = `
<b>Lorenzo Carbonell</b> a.k.a <a href="https://atareao.es">@atareao</a>"
`;
            return this._getNotebookPage(title, content);
        }
        _getContributorsPage(){
            const title = _("Contributors");
            const thanks = _("Thank you to all contributors!");
            const visit = _("For a list of all contributors, please visit");
            const url = Extension.metadata.url;
            const name = Extension.metadata.name;
            const content = `
<b>${thanks}</b>
${visit} <a href="${url}">${name}</a>`;
            return this._getNotebookPage(title, content);
        }
        _getSupportersPage(){
            const title = _("Supporters");
            const thanks = _("Thank you to all supporters!");
            const visit = _("For a list of all supporters, please visit");
            const content = `
<b>${thanks}</b>
${visit} <a href="https://atareao.es/supporters">Supporters</a>`;
            return this._getNotebookPage(title, content);
        }
        _getLicensePage(){
            const title = _("License");
            const content = `<small>
THE SOFTWARE IS PROVIDED AS IS, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE
</small>`;
            return this._getNotebookPage(title, content);
        }
        _getDoing(){
            const page = new Widgets.NotebookPage(_("More info"));
            const box = new Gtk.Box({
                marginStart: 24,
                marginEnd: 24,
                orientation: Gtk.Orientation.HORIZONTAL,
                halign: Gtk.Align.CENTER
            });
            const ghurl = Extension.metadata.description;
            const ghissue = `${ghurl}/issues`;
            
            const moreinfo = _("More information");
            page.appendImageWithLabel(
                "info", 24, `<a href="${ghurl}">${moreinfo}</a>`);
            const issue = _("Report an issue");
            page.appendImageWithLabel(
                "bug", 24, `<a href="${ghissue}">${issue}</a>`);

            box.append(this._getLinkButton(
                "youtube", 48, "https://atareao.es/youtube", "YouTube"));
            box.append(this._getLinkButton(
                "spotify", 48, "https://atareao.es/spotify", "Spotify"));
            box.append(this._getLinkButton(
                "github", 48, "https://atareao.es/github", "GitHub"));
            box.append(this._getLinkButton(
                "twitter", 48, "https://atareao.es/twitter", "Twitter"));
            box.append(this._getLinkButton(
                "mastodon", 48, "https://atareao.es/mastodon", "Mastodon"));
            box.append(this._getLinkButton(
                "telegram", 48, "https://atareao.es/telegram", "Telegram"));
            box.append(this._getLinkButton(
                "atareao", 48, "https://atareao.es", "atareao.es"));
            page.append(box);
            return page;
        }

        _getLinkButton(iconName, pixelSize, uri, tooltip){
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
                return linkButton;
            }
        }

        _getOS(){
            let prettyName;
            let osName;
            let versionID;
            let buildID;
            if((prettyName = GLib.get_os_info("PRETTY_NAME"))){
                osName = prettyName;
            }else{
                osName = GLib.get_os_info("NAME");
            }
            if((versionID = GLib.get_os_info("VERSION_ID"))){
                osName += `; Version ID: ${versionID}`;
            }
            if((buildID = GLib.get_os_info("BUILD_ID"))){
                osName += `; Build ID: ${buildID}`;
            }
            return osName;
        }

        _getSessionType(){
            return Extension.metadata.isWayLand?"Wayland":"X11";
        }


    }
);

