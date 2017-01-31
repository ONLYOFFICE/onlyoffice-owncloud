# ![](screenshots/icon.png) OwnCloud ONLYOFFICE integration app

This app enables users to edit office documents from [ownCloud](https://owncloud.com) using ONLYOFFICE Document Server. Currently the following document formats can be edited with this app: DOCX, XLSX, PPTX, TXT. The above mentioned formats are also available for viewing together with PDF and CSV. The edited files of the corresponding type can be converted into the Office Open XML formats: ODT, ODS, ODP, DOC, XLS, PPT, PPS, EPUB, RTF, HTML, HTM.

The app will create an item in the `new` (+) menu to create **Document**, **Spreadsheet**, **Presentation**. It will also create a new **Open in ONLYOFFICE** menu option within the document library for Office documents. This allows multiple users to collaborate in real time and to save back those changes to ownCloud. 



## Installing ONLYOFFICE Document Server

You will need an instance of ONLYOFFICE Document Server that is resolvable and connectable both from ownCloud and any end clients (version 3.0 and later are supported for use with the app). If that is not the case, use the official ONLYOFFICE Document Server documetnations page: [Document Server for Linux](http://helpcenter.onlyoffice.com/server/linux/document/linux-installation.aspx). ONLYOFFICE Document Server must also be able to POST to ownCloud directly.

The easiest way to start an instance of ONLYOFFICE Document Server is to use [Docker](https://github.com/ONLYOFFICE/Docker-DocumentServer).



## Installing ownCloud ONLYOFFICE integration app

To start using ONLYOFFICE Document Server with ownCloud, the following steps must be performed:

1. Place ownCloud ONLYOFFICE integration app to your ownCloud server into the _/apps_ (or some other) directory, [used](https://doc.owncloud.org/server/9.0/admin_manual/installation/apps_management_installation.html#using-custom-app-directories) to connect applications:
```
cd apps/
git clone https://github.com/ONLYOFFICE/onlyoffice-owncloud.git onlyoffic
```

2. In ownCloud open the `~/index.php/settings/apps?category=disabled` page with _Not enabled_ apps by administrator and click _Enable_ for the **ONLYOFFICE** application.



## Configuring ownCloud ONLYOFFICE integration app

In ownCloud open the `~/index.php/settings/admin#onlyoffice` page with administrative settings for **ONLYOFFICE** section and enter the address 

```
https://<documentserver>
```

Where the **documentserver** is the name of the server with the ONLYOFFICE Document Server installed. 



## How it works

The ONLYOFFICE integration follows the API documented here https://api.onlyoffice.com/editors/basic:

* When creating a new file, the user navigates to a document folder within ownCloud and clicks the **Document**, **Spreadsheet** or **Presentation* item in the _new_ (+) menu.

* The browser invokes the `create` method in the `/lib/Controller/EditorController.php` controller. This method adds the copy of the file from the assets folder to the folder the user is currently in.

* Or, when opening an existing file, the user navigates to it within ownCloud and selects the **Open in ONLYOFFICE** menu option.

* A new browser tab is opened and the `index` method of the `/lib/Controller/EditorController.php` controller is invoked.

* The app prepares a JSON object with the following properties:

  * **url** - the URL that ONLYOFFICE Document Server uses to download the document;
  * **callback** - the URL that ONLYOFFICE Document Server informs about status of the document editing;
  * **documentServerUrl** - the URL that the client needs to reply to ONLYOFFICE Document Server (can be set at the administrative settings page);
  * **key** - the UUID+Modified Timestamp to instruct ONLYOFFICE Document Server whether to download the document again or not;
  * **fileName** - the document Title (name);
  * **userId** - the identification of the user;
  * **userName** - the name of the user.

* ownCloud takes this object and constructs a page from `templates/editor.php` template, filling in all of those values so that the client browser can load up the editor.

* The client browser makes a request for the javascript library from ONLYOFFICE Document Server and sends ONLYOFFICE Document Server the DocEditor configuration with the above properties.

* Then ONLYOFFICE Document Server downloads the document from ownCloud and the user begins editing.

* ONLYOFFICE Document Server sends a POST request to the _callback_ URL to inform ownCloud that a user is editing the document.

* When all users and client browsers are done with editing, they close the editing window.

* After 10 seconds of inactivity, ONLYOFFICE Document Server sends a POST to the _callback_ URL letting ownCloud know that the clients have finished editing the document and closed it.

* ownCloud downloads the new version of the document, replacing the old one.
