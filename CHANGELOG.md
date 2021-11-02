# Change Log

## 7.2.1
## Added
- set favicon on editor page
- versions restore from editor

## Changed
- fixed privacy rules for get users when mention
- document server v6.0 and earlier is no longer supported
- editing by link only for available groups
- open share link directly

## 7.1.1
## Added
- support ownCloud Web
- mentions in comments
- favorite status in the editor
- creation from a template from the editor
- download as
- downloading a template from settings
- opening action link

## 6.4.3
## Changed
- fixed registration of file actions

## 6.4.1
## Added
- create file from editor
- more empty files in different languages
- file templates

## Changed
- open a version from the history of supported formats only
- document server v5.5 and earlier is no longer supported
- disabled copying to clipboard if there is no download permission

## 6.3.1
## Added
- viewing a locked file
- hide secret key in settings
- configuring version storage
- clearing history data

## Changed
- thumbnails for small files only
- history for federated share files is not stored

## 6.2.1
## Changed
- the ability to use forcesave for federated share files

## 6.1.1
## Added
- connection test command
- store author name for version
- generate file preview
- Italian translation

## Changed
- display local time in history

## 6.0.1
## Added
- saving intermediate versions when editing
- Chinese translation

## Changed
- fix image insertion
- fix styles for inline editor

## 5.0.1
## Added
- show the version of the Document Service on the settings page
- support for OpenDocument Templates
- Japanese translation
- certificate verification setting
- version history

## Changed
- apache license
- fix styles for inline editor
- loader page when creating a file

## 4.2.1
## Added
- review display settings

## 4.1.3
## Added
- inline editor if using the same tab, opening the sidebar, sharing from the editor
- setting zoom and autosave
- selection of a file for comparison (DocumentServer 5.5 required)

## Changed
- fix file opening if master key encryption is enabled

## 4.0.1
## Added
- Polish translation
- British (en_GB) file templates

## Changed
- co-editing for federated share
- Advanced Sharing Permissions APIv2

## 3.0.3
## Changed
- federated share saving fixed

## 3.0.1
## Added
- "save as" to the folder
- inserting images from the folder
- Mail Merge
- connection to the demo server

## Changed
- updated files for compatibility with MS Office v2016

## 2.3.1
## Added
- editor customization

## Changed
- the settings page is splitted into two sections
- support master key encryption

## 2.2.1
## Added
- download permission
- review permission
- filling forms permission
- comment permission
- modify filter permission

## Changed
- fix getting domain for desktop
- title in the convertation request

## 2.1.7
## Added
- file creation in public folder
- file convertion in public folder
- Bulgarian translation
- file templates in Dutch

## Changed
- fix editor size on mobile
- fix php warning

## 2.1.5
## Added
- access setting for filter change

## 2.1.3
## Added
- restricting access for groups
- goback from editor to shared folder by link

## Changed
- using notification methods

## 2.1.1
## Added
- Swedish translation
- support token in the body
- desktop mode

## Changed
- fix opening shared file by registered user
- fix translations

## 2.0.3
## Added
- opening for editing not OOXML

## Changed
- different keys for a file from different instances
- replace hash generator to JWT

## 2.0.1
## Changed
- deleted unsupported methods

## 1.4.0
## Added
- transition from the editor to the list of files in the same tab
- default action for all supported formats
- redirect to the login page if are not logged in
- a separate action to call the file conversion

## Changed
- improved checks when saving connection settings
- expanded the list of formats
- fixed exceptions when opening file shared by link

## 1.3.0
## Added
- add macro-enabled and template formats
- support shared link for document
- customization editor

## Changed
- update template empty files
- fix collaboration editing
- view without converting

## 1.2.0
## Added
- disabling for incorrect settings
- Brazilian Poruguese translation
- detecting mobile

## Changed
- initialization script
- case sensitivity in extension
- сreating files with an existing name

## 1.1.6
## Changed
- update description

## 1.1.5
## Added
- the ability to change the header key

## Changed
- fix opening file from external storage
- fix opening federated shared file

## 1.1.4
## Added
- extended list of languages for new files
- work with self-signed certificates

## Changed
- files of new presentations
- fix German l10n
- changed verification of settings

## 1.1.3
## Added
- fixing bug

## 1.1.2
## Added
- translation
- file name into page title

## 1.1.1
## Added
- translation
- signed code

## 1.0.5
### Added
- default name for new file
- getting default value from server config
- checking the encryption module

### Changed
- included editing for csv format
- fix track activities and versions

### Security
- jwt signature for inbox request from Document Server

## 1.0.4
### Added
- advanced server settings for specifying internal addresses
- opening file editor in a same tab

### Changed
- setting default aplication for editable formats
- new file on user language
- compatible with Nextcloud 12

## 1.0.3
- compatible with ownCloud 10

## 1.0.2
### Added
- logging
- checking Document Server address on save
- checking version of onlyoffice
- set language of editor

### Changed
- replace own Response class to OCP\AppFramework\Http class from core

### Security
- jwt signature for request to Document Server

## 1.0.1
- fix exception when versions app is disabled
- adding protocol to document server url
- onlyofficeOpen is default action
- Nextcloud 11 compatibility

## 1.0.0
- Initial release