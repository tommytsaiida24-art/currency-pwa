#!/bin/bash
# 生成 PWA Icon 圖示
# 需要 ImageMagick: sudo apt install imagemagick

INSTALL_IMAGICK="sudo apt install imagemagick"

check_imagick() {
    if ! command -v convert &> /dev/null; then
        echo "ImageMagick 未安裝"
        echo "執行: $INSTALL_IMAGICK"
        return 1
    fi
    return 0
}

generate_icons() {
    # 建立臨時目錄
    mkdir -p icons_temp
    
    # 下載或創建一個基礎圖示
    # 這裡用文字方式生成一個簡單的圓形圖示
    convert -size 512x512 xc:#667eea \
        -fill white -gravity center \
        -font Arial.ttf -pointsize 200 \
        -annotate 0 "💱" \
        icons_temp/icon-512.png
    
    convert -size 192x192 xc:#667eea \
        -fill white -gravity center \
        -font Arial.ttf -pointsize 75 \
        -annotate 0 "💱" \
        icons_temp/icon-192.png
    
    # 也可以用渐变背景
    convert -size 512x512 \
        gradient:'#667eea'-'#764ba2' \
        icons_temp/icon-512.png
    
    convert -size 192x192 \
        gradient:'#667eea'-'#764ba2' \
        icons_temp/icon-192.png
    
    # 加上 $ 符號
    convert icons_temp/icon-512.png \
        -fill white -gravity center \
        -font Arial-Bold.ttf -pointsize 280 \
        -annotate 0 "$" \
        icon-512.png
    
    convert icons_temp/icon-192.png \
        -fill white -gravity center \
        -font Arial-Bold.ttf -pointsize 105 \
        -annotate 0 "$" \
        icon-192.png
    
    # 清理
    rm -rf icons_temp
    
    echo "✅ Icon 生成完成！"
    echo "   - icon-192.png"
    echo "   - icon-512.png"
}

if check_imagick; then
    generate_icons
else
    echo ""
    echo "或者用手動方式創建圖示："
    echo "1. 去 https://realfavicongenerator.net"
    echo "2. 上傳一張 512x512 的圖片"
    echo "3. 下載產生的檔案"
    echo "4. 把 favicon.ico 改成 icon-192.png 和 icon-512.png"
fi
