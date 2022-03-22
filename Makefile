build: 
	docker build -t paybutton-server -f ./.docker/Dockerfile .

dev: 
	make build
	docker run -d -p 3000:3000 -v $(PWD):/app/ paybutton-server npm run dev