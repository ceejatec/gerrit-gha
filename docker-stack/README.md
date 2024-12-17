# First time setup

## Setting up Docker

Ensure Docker is running, and run `docker swarm init` to enable Swarm
mode.

## Setting up the Gerrit instance

Initializing the Gerrit config requires some manual intervention. First,
edit the file `swarm.yaml` and search for two places which say
"Uncomment the following to perform initial deployment". Uncomment those
two things. Then run

    ./go

This will launch a Gerrit container and a Jenkins container. The Gerrit
container will do initial configuration and then exit, which should only
take 10-15 seconds.

Once `docker service ps gerrit_gerrit` shows the container is shutdown,
re-edit `swarm.yaml` to its original state with those two sections
commented out, and then run

    ./go

again. This will update the Gerrit service, restarting it.

## Configuring Gerrit user

You can see the Gerrit UI at http://127.0.0.1:8080/ . You can log in by
clicking "Sign in" in the upper-right. The only available login method
out of the box is Launchpad, so hopefully you have a Launchpad account.
Sign in using that, which will create a new Gerrit user. That Gerrit
user will have administrator privileges.

Give that user a Gerrit username and set the HTTP password and an SSH
key in the standard way.

## Configuring Jenkins

You can see the Jenkins UI at http://127.0.0.1:8081/ . The first time
you visit that, you'll need to enter the auto-generated admin password,
which can be found in `./jenkins-home/secrets/initialAdminPassword`.

After that, you'll be prompted to pick the initial plugins to install.
None of the ones available to select up front are strictly necessary for
this POC, so select which ones you think might be convenient.

After the Jenkins UI is fully up and running, install the "Groovy Events
Listener" plugin.

## Removing the services

In future, you can bring down the whole stack by running

    docker stack rm gerrit

Re-running the `go` script will restart things, and the Gerrit and
Jenkins configuration will persist.
