| Language | Framework | Platform | Name| Author |
| -------- | -------- |--------|--------|
| Python | Django | Azure Web App, Virtual Machine|Visualize LiDAR Scanner Data in 3D Space| Anni Dai, Chenrui Lei|

## Application Overview

### Git repository contents

Here's an overview of the files you'll find in this Git repository

    \app\__init__.py
    \app\forms.py
    \app\models.py
    \app\tests.py
    \app\views.py
    \app\static\app\content\
    \app\static\app\fonts\
    \app\static\app\scripts\
    \app\templates\about.html
    \app\templates\contact.html
    \app\templates\index.html
    \app\templates\layout.html
    \app\templates\login.html
    \app\templates\loginpartial.html
    \app\templates\vtk_demo.html
    \python_webapp_django\__init__.py
    \python_webapp_django\settings.py
    \python_webapp_django\urls.py
    \python_webapp_django\wsgi.py


Main sources for the application. Pages index, about, contact, layout and static contents and scripts include bootstrap, jquery, modernizr and respond are genrated by Azure.
The main.js in \app\static\app is created for Webpack to bundle all ES6 Javascript.
The vtk_demo.js in \app\static\app\scripts contains the front-end 3D view code
The vtk_demo.html is the main page that can be accessed through https://miniprojectdatavisualization.azurewebsites.net

    \manage.py

Local management and development server support. Use this to run the application locally, synchronize the database, etc.

    \db.sqlite3

Default database. Includes the necessary tables for the application to run

    \python_webapp_django.pyproj

Project files for use with [Python Tools for Visual Studio].

    \webpack.config.js

Module bundler to use vtk and transform ES6 to ES5 so that it can be processed by the browser. Use this to bundle Javascript files.

    \requirements.txt

External packages needed by this application. The deployment script will pip install the packages listed in this file.

### Additional files on server

Some files exist on the server but are not added to the git repository.

    wwwroot\static\web.config

This enables the server to serve .vtp files

# Pre Request
1. Have Git, Node.js (9.8.0), python 3.5 installed

# Development Environment
1. clone the repo
1. setup python virtual environment
1. activate virtual environment
1. run `pip install -r requirement.txt`
1. run `npm install`

# Build for Development
1. run `npm run build`
1. wait for code to compile
1. run `manager.py runserver`
run `npm run build` every time when changes are made in js file that's imported by main.js

# Development Note
Whenever a new script in ES6 is added, import it in main.js. It will automatically compiled through webpack and been 
included in the build.js which is imported in vtk_demo.html. When `npm run build` is been called.

# Build for Deploy
1. run `npm run build:release`
1. run `manager.py collectstatic`
1. commit and push to github
The Azure will update automatically if the code is been pushed to master branch

## License:

See [LICENSE](LICENSE).

## Contributing

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

