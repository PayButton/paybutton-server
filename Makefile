build-image: 
	docker build -t paybutton-server -f ./.docker/Dockerfile .

dev: 
	make build-image
	docker run -p -d 3000:3000 -v $(PWD):/app/src/ paybutton-server npm run dev