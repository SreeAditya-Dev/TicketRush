FROM grafana/grafana:10.2.2

COPY ./provisioning /etc/grafana/provisioning
COPY ./dashboards /etc/grafana/dashboards

ENV GF_SECURITY_ADMIN_PASSWORD=admin
ENV GF_AUTH_ANONYMOUS_ENABLED=true
ENV GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer

EXPOSE 3000
