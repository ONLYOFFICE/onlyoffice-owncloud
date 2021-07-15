# ownCloud Web ONLYOFFICE integration app

This is a connector for integrating ONLYOFFICE Docs (packaged as Document Server) and ownCloud with new user interface called ownCloud Web.

## Features

The app allows to:

* Create and edit text documents, spreadsheets, and presentations in docx, xlsx, pptx formats
* Edit and co-edit docx, xlsx, pptx

## Installing ONLYOFFICE Docs

You will need an instance of ONLYOFFICE Docs (Document Server) that is resolvable and connectable both from ownCloud and any end clients. Document Server must also be able to POST to ownCloud directly.

Document Server and ownCloud can be installed either on different computers, or on the same machine. 

If you use one machine, set up a custom port for Document Server as by default both Document Server and ownCloud work on port 80.

You can install free [Community version of ONLYOFFICE Docs](https://helpcenter.onlyoffice.com/installation/docs-community-index.aspx) or scalable [Enterprise Edition with pro features](https://helpcenter.onlyoffice.com/installation/docs-enterprise-index.aspx).

Community Edition vs Enterprise Edition comparison can be found [here](#onlyoffice-docs-editions).

## Installing connector for ownCloud Web

You will need:
* [ownCloud server](https://owncloud.com/download-server/#owncloud-server) with ownCloud Web (it can be compiled from source code or installed from the [official marketplace](https://marketplace.owncloud.com/apps/web)).
* Official ownCloud ONLYOFFICE integration app. You can install it from the [ownCloud marketplace](https://marketplace.owncloud.com/apps/onlyoffice). The support for ownCloud Web starts from v7.*.

To enable work within ownCloud web, register the connector in the ownCloud Web config.json:

* If you installed ownCloud Web from the official marketplace, the path is `<owncloud-root-catalog>/config/config.json`
* If you compiled it from source code yourself using [this instruction](https://owncloud.dev/clients/web/backend-oc10/#running-web), the path is `<owncloud-web-root-catalog>/config/config.json`.

To register the connector, use these lines:

```
"external_apps": [
    {
        "id": "onlyoffice",
        "path": "http(s)://<owncloud-10-server-address>/custom/onlyoffice/js/web/onlyoffice.js",
    }
]
```

## ONLYOFFICE Docs editions

ONLYOFFICE offers different versions of its online document editors that can be deployed on your own servers.

* Community Edition (`onlyoffice-documentserver` package)
* Enterprise Edition (`onlyoffice-documentserver-ee` package)

The table below will help you to make the right choice.

| Pricing and licensing | Community Edition | Enterprise Edition |
| ------------- | ------------- | ------------- |
| | [Get it now](https://www.onlyoffice.com/download.aspx?utm_source=github&utm_medium=cpc&utm_campaign=GitHubOwncloudWeb)  | [Start Free Trial](https://www.onlyoffice.com/enterprise-edition-free.aspx?utm_source=github&utm_medium=cpc&utm_campaign=GitHubOwncloudWeb)  |
| Cost  | FREE  | [Go to the pricing page](https://www.onlyoffice.com/docs-enterprise-prices.aspx?utm_source=github&utm_medium=cpc&utm_campaign=GitHubOwncloudWeb)  |
| Simultaneous connections | up to 20 maximum  | As in chosen pricing plan |
| Number of users | up to 20 recommended | As in chosen pricing plan |
| License | GNU AGPL v.3 | Proprietary |
| **Support** | **Community Edition** | **Enterprise Edition** |
| Documentation | [Help Center](https://helpcenter.onlyoffice.com/installation/docs-community-index.aspx) | [Help Center](https://helpcenter.onlyoffice.com/installation/docs-enterprise-index.aspx) |
| Standard support | [GitHub](https://github.com/ONLYOFFICE/DocumentServer/issues) or paid | One year support included |
| Premium support | [Buy Now](https://www.onlyoffice.com/support.aspx?utm_source=github&utm_medium=cpc&utm_campaign=GitHubOwncloudWeb) | [Buy Now](https://www.onlyoffice.com/support.aspx?utm_source=github&utm_medium=cpc&utm_campaign=GitHubOwncloudWeb) |
| **Services** | **Community Edition** | **Enterprise Edition** |
| Conversion Service                | + | + |
| Document Builder Service          | + | + |
| **Interface** | **Community Edition** | **Enterprise Edition** |
| Tabbed interface                       | + | + |
| Dark theme                             | + | + |
| 150% scaling                           | + | + |
| White Label                            | - | - |
| Integrated test example (node.js)*     | + | + |
| Mobile web editors | - | + |
| Access to pro features via desktop     | - | + |
| **Plugins & Macros** | **Community Edition** | **Enterprise Edition** |
| Plugins                           | + | + |
| Macros                            | + | + |
| **Collaborative capabilities** | **Community Edition** | **Enterprise Edition** |
| Two co-editing modes              | + | + |
| Comments                          | + | + |
| Built-in chat                     | + | + |
| Review and tracking changes       | + | + |
| Display modes of tracking changes | + | + |
| Version history                   | + | + |
| **Document Editor features** | **Community Edition** | **Enterprise Edition** |
| Font and paragraph formatting   | + | + |
| Object insertion                | + | + |
| Adding Content control          | - | + | 
| Editing Content control         | + | + | 
| Layout tools                    | + | + |
| Table of contents               | + | + |
| Navigation panel                | + | + |
| Mail Merge                      | + | + |
| Comparing Documents             | - | +* |
| **Spreadsheet Editor features** | **Community Edition** | **Enterprise Edition** |
| Font and paragraph formatting   | + | + |
| Object insertion                | + | + |
| Functions, formulas, equations  | + | + |
| Table templates                 | + | + |
| Pivot tables                    | + | + |
| Data validation                 | + | + |
| Conditional formatting  for viewing | +** | +** |
| **Presentation Editor features** | **Community Edition** | **Enterprise Edition** |
| Font and paragraph formatting   | + | + |
| Object insertion                | + | + |
| Transitions                     | + | + |
| Presenter mode                  | + | + |
| Notes                           | + | + |
| | [Get it now](https://www.onlyoffice.com/download.aspx?utm_source=github&utm_medium=cpc&utm_campaign=GitHubOwncloud)  | [Start Free Trial](https://www.onlyoffice.com/enterprise-edition-free.aspx?utm_source=github&utm_medium=cpc&utm_campaign=GitHubOwncloud)  |

\*  It's possible to add documents for comparison from your local drive, from URL and from ownCloud storage.

\** Support for all conditions and gradient. Adding/Editing capabilities are coming soon


