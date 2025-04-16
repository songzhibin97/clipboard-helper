.PHONY: all install start pack dist clean create-icon

all: install start

install:
	npm install

start:
	npm start

pack:
	npm run pack

dist:
	npm run dist

clean:
	rm -rf node_modules package-lock.json dist

create-icon:
	@echo "请确保 assets/tray-icon.png 已放置在 assets 目录下（推荐 16x16 或 32x32 像素）。"
	@if [ ! -f assets/tray-icon.png ]; then \
		echo "未找到 tray-icon.png，将使用默认文本图标。"; \
	fi
	@if [ ! -d assets ]; then \
		mkdir -p assets; \
		echo "已创建 assets 目录，请将 tray-icon.png 放入其中。"; \
	fi