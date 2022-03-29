import React from "react";
import {
  FormRenderer,
  componentTypes,
} from "@data-driven-forms/react-form-renderer";
import {
  componentMapper,
} from "@data-driven-forms/mui-component-mapper";
import FormTemplate from "@data-driven-forms/mui-component-mapper/form-template";

const schema = {
  fields: [
    {
      component: "text-field",
      name: "text-field",
      label: "Address",
      helperText: "XEC or BCH wallet address ",
    },
  ],
};

const Form = () => (
  <FormRenderer
    schema={schema}
    componentMapper={componentMapper}
    FormTemplate={FormTemplate}
    onSubmit={console.log}
  />
);

export default Form;
