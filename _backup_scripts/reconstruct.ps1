$lines1 = Get-Content transcript_match.txt
$lines2 = Get-Content transcript_match2.txt
$final = @()
foreach ($line in $lines1) {
    if ($line -match '^\d+:(?:\s(.*))?$') {
        $final += $matches[1]
    }
}
foreach ($line in $lines2) {
    if ($line -match '^800:') { continue }
    if ($line -match '^\d+:(?:\s(.*))?$') {
        $final += $matches[1]
    }
}

$text = $final -join "
"

$text = $text.Replace('if (isAssociationClass) relationId = classIds.get(relation.claseAsociacion());', '// if (isAssociationClass) ...')
$text = $text.Replace("sourceId,
                    relationId,
                    relation.rolOrigen()", "sourceId,
                    isAssociationClass ? classIds.get(relation.claseAsociacion()) : relationId,
                    relation.rolOrigen()")
$text = $text.Replace("targetId,
                    relationId,
                    relation.rolDestino()", "targetId,
                    isAssociationClass ? classIds.get(relation.claseAsociacion()) : relationId,
                    relation.rolDestino()")
$text = $text.Replace('extendedProperties.setAttribute("associationclass", relationIds.get(association.id()));', 'extendedProperties.setAttribute("associationclass", classIds.get(umlClass.id()));')

$utf8NoBom = New-Object System.Text.UTF8Encoding $False
[IO.File]::WriteAllText(".\backend\src\main\java\com\umlforge\backend\service\XmiExportService.java", $text, $utf8NoBom)
