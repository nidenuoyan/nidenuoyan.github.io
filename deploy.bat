@echo off
echo 正在生成静态文件...
hexo clean
hexo generate

echo 正在复制文件到服务器...
xcopy /E /Y "public\*" "E:\phpstudy_pro\WWW\zoengsang.cloud\"

echo 部署完成！
pause