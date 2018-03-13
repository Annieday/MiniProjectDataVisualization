| Language | Framework | Platform | Author |
| -------- | -------- |--------|--------|
| Python | Django | Azure Web App, Virtual Machine| Anni Dai, Chenrui Lei|


# Python Django web application

Sample Python Django web application built using Visual Studio 2017.

# Development Enviroment
1. clone the repo
1. setup python virtual environment
1. activate virtual environment
1. run `pip install -r requirement.txt`
1. run `npm install`

# Compile and Run
1. run `npm run build`
1. run `npm start`
1. wait for code to compile
1. run `manager.py runserver`

# Development Note
Whenever a new script is added, import it in main.js. It will automatically compiled through webpack and been 
included in the build.js which is imported in vtk_demo.html.

# build for Deploy
1. run `npm run build:release`
1. run `manager.py collectstatic`
1. commit and push to github

## License:

See [LICENSE](LICENSE).

## Contributing

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

