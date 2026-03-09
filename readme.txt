если профиля нет, или выпадает ошибка, то нужно в командной строке ее создать 

if (!(Test-Path -Path $PROFILE)) {
    New-Item -Type File -Path $PROFILE -Force
}
notepad $PROFILE

далее скопировать из файла notepad $PROFILE и вставить в командную строку