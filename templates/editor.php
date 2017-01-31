<?php
/**
 *
 * (c) Copyright Ascensio System Limited 2010-2017
 *
 * This program is freeware. You can redistribute it and/or modify it under the terms of the GNU 
 * General Public License (GPL) version 3 as published by the Free Software Foundation (https://www.gnu.org/copyleft/gpl.html). 
 * In accordance with Section 7(a) of the GNU GPL its Section 15 shall be amended to the effect that 
 * Ascensio System SIA expressly excludes the warranty of non-infringement of any third-party rights.
 *
 * THIS PROGRAM IS DISTRIBUTED WITHOUT ANY WARRANTY; WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR
 * FITNESS FOR A PARTICULAR PURPOSE. For more details, see GNU GPL at https://www.gnu.org/copyleft/gpl.html
 *
 * You can contact Ascensio System SIA by email at sales@onlyoffice.com
 *
 * The interactive user interfaces in modified source and object code versions of ONLYOFFICE must display 
 * Appropriate Legal Notices, as required under Section 5 of the GNU GPL version 3.
 *
 * Pursuant to Section 7 § 3(b) of the GNU GPL you must retain the original ONLYOFFICE logo which contains 
 * relevant author attributions when distributing the software. If the display of the logo in its graphic 
 * form is not reasonably feasible for technical reasons, you must include the words "Powered by ONLYOFFICE" 
 * in every copy of the program you distribute. 
 * Pursuant to Section 7 § 3(e) we decline to grant you any rights under trademark law for use of our trademarks.
 *
*/

    style("onlyoffice", "editor");
    script("onlyoffice", "editor");
?>

<div id="app">

    <div id="iframeEditor"></div>

    <?php if (!empty($_["documentServerUrl"])) {
        print_unescaped("<script src=\"") .
        p($_["documentServerUrl"]) .
        print_unescaped("/web-apps/apps/api/documents/api.js\" type=\"text/javascript\"></script>");
    } ?>
    

    <script type="text/javascript">
        OCA.Onlyoffice.OpenEditor ({
            error: "<?php empty($_["error"]) ? "" : p($_["error"]) ?>",

            callbackUrl: "<?php print_unescaped($_["callback"]) ?>",
            key: "<?php p($_["key"]) ?>",
            title: "<?php p($_["fileName"]) ?>",
            url: "<?php print_unescaped($_["url"]) ?>",
            userId: "<?php p($_["userId"]) ?>",
            userName: "<?php p($_["userName"]) ?>",
            documentType: "<?php p($_["documentType"]) ?>",
        });
    </script>

</div>
